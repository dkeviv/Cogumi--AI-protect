package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Configuration loaded from environment variables
type Config struct {
	Token      string
	APIURL     string
	ProjectID  string
	ListenAddr string
}

// ProjectConfig fetched from SaaS API
type ProjectConfig struct {
	ProjectID        string   `json:"projectId"`
	ProjectName      string   `json:"projectName"`
	ToolDomains      []string `json:"toolDomains"`
	InternalSuffixes []string `json:"internalSuffixes"`
}

// Event represents a captured HTTP event
type Event struct {
	EventType       string            `json:"event_type"`
	Timestamp       time.Time         `json:"timestamp"`
	ProjectID       string            `json:"project_id"`
	Method          string            `json:"method,omitempty"`
	URL             string            `json:"url,omitempty"`
	Host            string            `json:"host,omitempty"`
	Path            string            `json:"path,omitempty"`
	StatusCode      int               `json:"status_code,omitempty"`
	Headers         map[string]string `json:"headers,omitempty"`
	Body            string            `json:"body,omitempty"`
	BodyTruncated   bool              `json:"body_truncated,omitempty"`
	DestinationType string            `json:"destination_type,omitempty"`
	SecretMatches   []SecretMatch     `json:"secret_matches,omitempty"`
	Protocol        string            `json:"protocol,omitempty"`
}

// SecretMatch represents a detected secret
type SecretMatch struct {
	Type       string  `json:"type"`
	Preview    string  `json:"preview"`
	Confidence float64 `json:"confidence"`
	Location   string  `json:"location"`
}

// EventBatch for shipping to SaaS
type EventBatch struct {
	Events []Event `json:"events"`
}

// Sidecar proxy server
type Sidecar struct {
	config        Config
	projectConfig *ProjectConfig
	client        *http.Client
	eventBuffer   []Event
	eventMutex    sync.Mutex
	throttleCount int
	lastShip      time.Time
}

func main() {
	config := loadConfig()
	
	sidecar := &Sidecar{
		config: config,
		client: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: false},
			},
		},
		eventBuffer: make([]Event, 0),
		lastShip:    time.Now(),
	}

	// Fetch project configuration from SaaS API
	if err := sidecar.fetchProjectConfig(); err != nil {
		log.Printf("Warning: Failed to fetch project config: %v (will use default classification)", err)
	}

	// Start background tasks
	go sidecar.heartbeatLoop()
	go sidecar.eventShipperLoop()

	// Start HTTP proxy server
	log.Printf("Starting sidecar proxy on %s", config.ListenAddr)
	server := &http.Server{
		Addr:    config.ListenAddr,
		Handler: http.HandlerFunc(sidecar.handleRequest),
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func loadConfig() Config {
	token := os.Getenv("COGUMI_TOKEN")
	if token == "" {
		log.Fatal("COGUMI_TOKEN environment variable is required")
	}

	apiURL := os.Getenv("COGUMI_API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:3001"
	}

	projectID := os.Getenv("COGUMI_PROJECT_ID")
	if projectID == "" {
		log.Fatal("COGUMI_PROJECT_ID environment variable is required")
	}

	listenAddr := os.Getenv("LISTEN_ADDR")
	if listenAddr == "" {
		// SECURITY: Bind to localhost by default, not all interfaces
		// This prevents unauthorized access from other machines on the network
		listenAddr = "127.0.0.1:8080"
	}

	return Config{
		Token:      token,
		APIURL:     apiURL,
		ProjectID:  projectID,
		ListenAddr: listenAddr,
	}
}

// Handle incoming HTTP requests (both HTTP and HTTPS CONNECT)
func (s *Sidecar) handleRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodConnect {
		s.handleConnect(w, r)
	} else {
		s.handleHTTP(w, r)
	}
}

// Handle regular HTTP requests
func (s *Sidecar) handleHTTP(w http.ResponseWriter, r *http.Request) {
	// Capture request event
	requestEvent := Event{
		EventType:       "http_request",
		Timestamp:       time.Now(),
		ProjectID:       s.config.ProjectID,
		Method:          r.Method,
		URL:             r.URL.String(),
		Host:            r.Host,
		Path:            r.URL.Path,
		Headers:         s.redactHeaders(r.Header),
		DestinationType: s.classifyDestination(r.Host),
		Protocol:        "http",
	}

	// Read and capture body (if present)
	var bodyBytes []byte
	if r.Body != nil {
		bodyBytes, _ = io.ReadAll(r.Body)
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		
		if len(bodyBytes) > 0 && len(bodyBytes) < 10000 { // Only capture small bodies
			bodyStr := string(bodyBytes)
			requestEvent.Body = bodyStr
			requestEvent.SecretMatches = s.detectSecrets(bodyStr, "request_body")
		} else if len(bodyBytes) >= 10000 {
			requestEvent.BodyTruncated = true
		}
	}

	s.bufferEvent(requestEvent)

	// Forward request
	proxyReq, err := http.NewRequest(r.Method, r.URL.String(), bytes.NewBuffer(bodyBytes))
	if err != nil {
		http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
		return
	}

	// Copy headers
	for key, values := range r.Header {
		for _, value := range values {
			proxyReq.Header.Add(key, value)
		}
	}

	// Execute request
	resp, err := s.client.Do(proxyReq)
	if err != nil {
		http.Error(w, fmt.Sprintf("Proxy request failed: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Capture response event
	responseEvent := Event{
		EventType:  "http_response",
		Timestamp:  time.Now(),
		ProjectID:  s.config.ProjectID,
		StatusCode: resp.StatusCode,
		Headers:    s.redactHeaders(resp.Header),
		Protocol:   "http",
	}

	// Read response body
	respBodyBytes, _ := io.ReadAll(resp.Body)
	if len(respBodyBytes) > 0 && len(respBodyBytes) < 10000 {
		bodyStr := string(respBodyBytes)
		responseEvent.Body = bodyStr
		responseEvent.SecretMatches = s.detectSecrets(bodyStr, "response_body")
	} else if len(respBodyBytes) >= 10000 {
		responseEvent.BodyTruncated = true
	}

	s.bufferEvent(responseEvent)

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Write response
	w.WriteHeader(resp.StatusCode)
	w.Write(respBodyBytes)
}

// Handle HTTPS CONNECT tunneling (capture metadata only)
func (s *Sidecar) handleConnect(w http.ResponseWriter, r *http.Request) {
	// Capture CONNECT event (metadata only - no TLS decryption)
	connectEvent := Event{
		EventType:       "https_connect",
		Timestamp:       time.Now(),
		ProjectID:       s.config.ProjectID,
		Method:          "CONNECT",
		Host:            r.Host,
		DestinationType: s.classifyDestination(r.Host),
		Protocol:        "https",
	}
	s.bufferEvent(connectEvent)

	// Establish connection to destination
	destConn, err := net.DialTimeout("tcp", r.Host, 10*time.Second)
	if err != nil {
		http.Error(w, "Failed to connect to destination", http.StatusBadGateway)
		return
	}
	defer destConn.Close()

	// Hijack the connection
	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "Hijacking not supported", http.StatusInternalServerError)
		return
	}

	clientConn, _, err := hijacker.Hijack()
	if err != nil {
		http.Error(w, "Failed to hijack connection", http.StatusInternalServerError)
		return
	}
	defer clientConn.Close()

	// Send 200 Connection Established
	clientConn.Write([]byte("HTTP/1.1 200 Connection Established\r\n\r\n"))

	// Tunnel traffic bidirectionally (no inspection)
	go io.Copy(destConn, clientConn)
	io.Copy(clientConn, destConn)
}

// Fetch project configuration from SaaS API
func (s *Sidecar) fetchProjectConfig() error {
	url := fmt.Sprintf("%s/api/sidecar/config", s.config.APIURL)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.config.Token))
	
	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch config: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}
	
	var config ProjectConfig
	if err := json.NewDecoder(resp.Body).Decode(&config); err != nil {
		return fmt.Errorf("failed to decode config: %w", err)
	}
	
	s.projectConfig = &config
	log.Printf("Loaded project config: %s (tools: %d, internal: %d)", 
		config.ProjectName, len(config.ToolDomains), len(config.InternalSuffixes))
	
	return nil
}

// Classify destination type
func (s *Sidecar) classifyDestination(host string) string {
	hostLower := strings.ToLower(host)
	
	// Check customer-configured internal suffixes first
	if s.projectConfig != nil {
		for _, suffix := range s.projectConfig.InternalSuffixes {
			if strings.HasSuffix(hostLower, strings.ToLower(suffix)) {
				return "internal_api"
			}
		}
	}
	
	// Built-in internal network patterns
	if strings.Contains(hostLower, ".internal") || 
	   strings.Contains(hostLower, ".local") || 
	   strings.HasPrefix(hostLower, "localhost") ||
	   strings.HasPrefix(hostLower, "127.") ||
	   strings.HasPrefix(hostLower, "10.") ||
	   strings.HasPrefix(hostLower, "192.168.") {
		return "internal_api"
	}
	
	// Known LLM providers
	llmProviders := []string{
		"api.openai.com",
		"api.anthropic.com",
		"api.cohere.ai",
		"api.together.xyz",
		"generativelanguage.googleapis.com", // Google Gemini
		"openrouter.ai",
	}
	for _, provider := range llmProviders {
		if strings.Contains(hostLower, provider) {
			return "llm_provider"
		}
	}
	
	// Customer-configured tool domains
	if s.projectConfig != nil {
		for _, tool := range s.projectConfig.ToolDomains {
			if strings.Contains(hostLower, strings.ToLower(tool)) {
				return "tool"
			}
		}
	}
	
	// Common tool/service domains (fallback)
	toolDomains := []string{
		"api.stripe.com",
		"api.github.com",
		"api.slack.com",
		"hooks.slack.com",
		"discord.com",
		"api.twilio.com",
		"sendgrid.com",
	}
	for _, tool := range toolDomains {
		if strings.Contains(hostLower, tool) {
			return "tool"
		}
	}
	
	// Suspicious attacker sink patterns (pastebin-like, data exfil services)
	attackerSinks := []string{
		"pastebin.com",
		"hastebin.com",
		"dpaste.com",
		"requestbin",
		"webhook.site",
		"pipedream.net",
	}
	for _, sink := range attackerSinks {
		if strings.Contains(hostLower, sink) {
			return "attacker_sink"
		}
	}
	
	// Default to public internet
	return "public_internet"
}

// Redact sensitive headers
func (s *Sidecar) redactHeaders(headers http.Header) map[string]string {
	redacted := make(map[string]string)
	sensitiveHeaders := []string{"authorization", "cookie", "api-key", "x-api-key"}
	
	for key, values := range headers {
		lowerKey := strings.ToLower(key)
		isSensitive := false
		
		for _, sensitive := range sensitiveHeaders {
			if strings.Contains(lowerKey, sensitive) {
				isSensitive = true
				break
			}
		}
		
		if isSensitive {
			redacted[key] = "[REDACTED]"
		} else {
			redacted[key] = strings.Join(values, ", ")
		}
	}
	
	return redacted
}

// Detect secrets in text
func (s *Sidecar) detectSecrets(text string, location string) []SecretMatch {
	matches := []SecretMatch{}
	
	// OpenAI API Key pattern
	openaiPattern := regexp.MustCompile(`sk-[a-zA-Z0-9]{48}`)
	if openaiMatches := openaiPattern.FindAllString(text, -1); len(openaiMatches) > 0 {
		for _, match := range openaiMatches {
			matches = append(matches, SecretMatch{
				Type:       "openai_api_key",
				Preview:    match[:10] + "..." + match[len(match)-4:],
				Confidence: 0.95,
				Location:   location,
			})
		}
	}
	
	// AWS Access Key pattern
	awsPattern := regexp.MustCompile(`AKIA[0-9A-Z]{16}`)
	if awsMatches := awsPattern.FindAllString(text, -1); len(awsMatches) > 0 {
		for _, match := range awsMatches {
			matches = append(matches, SecretMatch{
				Type:       "aws_access_key",
				Preview:    match[:8] + "..." + match[len(match)-4:],
				Confidence: 0.90,
				Location:   location,
			})
		}
	}
	
	// Generic API key pattern
	apiKeyPattern := regexp.MustCompile(`(?i)api[_-]?key["\s:=]+([a-zA-Z0-9_\-]{32,})`)
	if apiKeyMatches := apiKeyPattern.FindAllStringSubmatch(text, -1); len(apiKeyMatches) > 0 {
		for _, match := range apiKeyMatches {
			if len(match) > 1 {
				key := match[1]
				matches = append(matches, SecretMatch{
					Type:       "generic_api_key",
					Preview:    key[:min(8, len(key))] + "...",
					Confidence: 0.70,
					Location:   location,
				})
			}
		}
	}
	
	return matches
}

// Buffer events for batch shipping
func (s *Sidecar) bufferEvent(event Event) {
	s.eventMutex.Lock()
	defer s.eventMutex.Unlock()
	
	s.eventBuffer = append(s.eventBuffer, event)
	
	// Check if we should throttle
	if len(s.eventBuffer) > 1000 {
		s.throttleCount++
		throttleEvent := Event{
			EventType: "ingest_throttled",
			Timestamp: time.Now(),
			ProjectID: s.config.ProjectID,
		}
		s.eventBuffer = append(s.eventBuffer, throttleEvent)
	}
}

// Background loop to ship events
func (s *Sidecar) eventShipperLoop() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	
	for range ticker.C {
		s.shipEvents()
	}
}

// Ship buffered events to SaaS
func (s *Sidecar) shipEvents() {
	s.eventMutex.Lock()
	if len(s.eventBuffer) == 0 {
		s.eventMutex.Unlock()
		return
	}
	
	events := make([]Event, len(s.eventBuffer))
	copy(events, s.eventBuffer)
	s.eventBuffer = s.eventBuffer[:0] // Clear buffer
	s.eventMutex.Unlock()
	
	batch := EventBatch{Events: events}
	jsonData, err := json.Marshal(batch)
	if err != nil {
		log.Printf("Failed to marshal events: %v", err)
		return
	}
	
	req, err := http.NewRequest("POST", s.config.APIURL+"/api/ingest/events", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("Failed to create ingest request: %v", err)
		return
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.config.Token)
	
	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("Failed to ship events: %v", err)
		return
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		log.Printf("Event ingestion failed with status: %d", resp.StatusCode)
	} else {
		log.Printf("Shipped %d events successfully", len(events))
	}
}

// Background loop to send heartbeats
func (s *Sidecar) heartbeatLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	// Send initial heartbeat
	s.sendHeartbeat()
	
	for range ticker.C {
		s.sendHeartbeat()
	}
}

// Send heartbeat to SaaS
func (s *Sidecar) sendHeartbeat() {
	req, err := http.NewRequest("POST", s.config.APIURL+"/api/heartbeat", nil)
	if err != nil {
		log.Printf("Failed to create heartbeat request: %v", err)
		return
	}
	
	req.Header.Set("Authorization", "Bearer "+s.config.Token)
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	req = req.WithContext(ctx)
	
	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("Heartbeat failed: %v", err)
		return
	}
	defer resp.Body.Close()
	
	if resp.StatusCode == http.StatusOK {
		log.Println("Heartbeat sent successfully")
	} else {
		log.Printf("Heartbeat failed with status: %d", resp.StatusCode)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
