package cache

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// CacheFallbackEvent represents a single cache fallback event
type CacheFallbackEvent struct {
	Timestamp     time.Time `json:"timestamp"`
	Model         string    `json:"model"`
	InputTokens   int64     `json:"input_tokens"`
	CacheRead     int64     `json:"cache_read"`
	CacheWrite    int64     `json:"cache_write"`
	EstimatedLoss float64   `json:"estimated_loss"`
}

// ErrorEvent represents a single upstream 500 error event
type ErrorEvent struct {
	Timestamp   time.Time `json:"timestamp"`
	Model       string    `json:"model"`
	StatusCode int       `json:"status_code"`
	ErrorMsg    string    `json:"error_msg"`
}

// EventBuffer stores events in a sliding time window
type EventBuffer struct {
	events     []CacheFallbackEvent
	windowSize time.Duration
	mu         sync.RWMutex
}

// ErrorBuffer stores error events in a sliding time window
type ErrorBuffer struct {
	events     []ErrorEvent
	windowSize time.Duration
	mu         sync.RWMutex
}

// NewEventBuffer creates a new event buffer with the specified window size
func NewEventBuffer(windowSize time.Duration) *EventBuffer {
	return &EventBuffer{
		events:     make([]CacheFallbackEvent, 0, 100),
		windowSize: windowSize,
	}
}

// NewErrorBuffer creates a new error buffer with the specified window size
func NewErrorBuffer(windowSize time.Duration) *ErrorBuffer {
	return &ErrorBuffer{
		events:     make([]ErrorEvent, 0, 100),
		windowSize: windowSize,
	}
}

// AddErrorEvent adds an error event to the buffer and removes old events
func (b *ErrorBuffer) AddErrorEvent(event ErrorEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.events = append(b.events, event)

	// Remove events outside the time window
	cutoff := time.Now().Add(-b.windowSize)
	var validEvents []ErrorEvent
	for _, e := range b.events {
		if e.Timestamp.After(cutoff) {
			validEvents = append(validEvents, e)
		}
	}
	b.events = validEvents
}

// GetErrorsInWindow returns a copy of all error events currently in the window
func (b *ErrorBuffer) GetErrorsInWindow() []ErrorEvent {
	b.mu.RLock()
	defer b.mu.RUnlock()

	result := make([]ErrorEvent, len(b.events))
	copy(result, b.events)
	return result
}

// ClearErrors removes all error events from the buffer
func (b *ErrorBuffer) ClearErrors() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.events = []ErrorEvent{}
}

// AddEvent adds an event to the buffer and removes old events outside the window
func (b *EventBuffer) AddEvent(event CacheFallbackEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.events = append(b.events, event)

	// Remove events outside the time window
	cutoff := time.Now().Add(-b.windowSize)
	var validEvents []CacheFallbackEvent
	for _, e := range b.events {
		if e.Timestamp.After(cutoff) {
			validEvents = append(validEvents, e)
		}
	}
	b.events = validEvents
}

// GetEventsInWindow returns a copy of all events currently in the window
func (b *EventBuffer) GetEventsInWindow() []CacheFallbackEvent {
	b.mu.RLock()
	defer b.mu.RUnlock()

	result := make([]CacheFallbackEvent, len(b.events))
	copy(result, b.events)
	return result
}

// Clear removes all events from the buffer
func (b *EventBuffer) Clear() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.events = []CacheFallbackEvent{}
}

// AlertRateLimiter prevents alert spam
type AlertRateLimiter struct {
	lastAlertTime time.Time
	minInterval   time.Duration
	mu            sync.Mutex
}

// NewAlertRateLimiter creates a new rate limiter with the specified minimum interval
func NewAlertRateLimiter(minInterval time.Duration) *AlertRateLimiter {
	return &AlertRateLimiter{
		minInterval: minInterval,
	}
}

// ShouldSend returns true if enough time has passed since the last alert
func (r *AlertRateLimiter) ShouldSend() bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	if now.Sub(r.lastAlertTime) < r.minInterval {
		return false
	}
	return true
}

// RecordSent updates the last alert time to now
func (r *AlertRateLimiter) RecordSent() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.lastAlertTime = time.Now()
}

// CacheDetector detects cache fallback events and 500 errors, sends alerts
type CacheDetector struct {
	buffer           *EventBuffer
	errorBuffer      *ErrorBuffer
	rateLimiter      *AlertRateLimiter
	errorRateLimiter *AlertRateLimiter
	resendClient     ResendClient
	thresholdCount   int
	errorThreshold   int
	windowSize       time.Duration
	enabled          bool
	alertEmail       string
}

// ResendClient interface for sending emails (allows mocking in tests)
type ResendClient interface {
	SendEmail(from, to, subject, htmlBody string) error
}

// DefaultResendClient is the real implementation using Resend API
type DefaultResendClient struct {
	apiKey string
	client *http.Client
}

// SendEmail sends an email via Resend API
func (d *DefaultResendClient) SendEmail(from, to, subject, htmlBody string) error {
	if d.apiKey == "" {
		log.Printf("📧 [EMAIL MOCK] From: %s, To: %s, Subject: %s", from, to, subject)
		log.Printf("📧 [EMAIL MOCK] Body: %s", htmlBody)
		log.Printf("⚠️  No RESEND_API_KEY set, email not sent")
		return nil
	}

	// Resend API endpoint
	url := "https://api.resend.com/emails"

	// Build request body
	reqBody := map[string]interface{}{
		"from":    from,
		"to":      []string{to},
		"subject": subject,
		"html":    htmlBody,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+d.apiKey)

	// Send request
	resp, err := d.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Check response
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("Resend API returned status %d", resp.StatusCode)
	}

	log.Printf("✅ [EMAIL] Sent to %s: %s", to, subject)
	return nil
}

// global detector instance
var globalDetector *CacheDetector
var detectorOnce sync.Once

// GetCacheDetector returns the singleton detector instance
func GetCacheDetector() *CacheDetector {
	return globalDetector
}

// IsEnabled returns true if the detector is enabled
func (d *CacheDetector) IsEnabled() bool {
	return d.enabled
}

// InitCacheDetector initializes the global cache detector
func InitCacheDetector(enabled bool, thresholdCount int, windowSizeMin, alertIntervalMin int, resendAPIKey, alertEmail string) *CacheDetector {
	return InitCacheDetectorWithError(enabled, thresholdCount, 6, windowSizeMin, alertIntervalMin, resendAPIKey, alertEmail)
}

// InitCacheDetectorWithError initializes the global cache detector with error detection
func InitCacheDetectorWithError(enabled bool, thresholdCount int, errorThreshold int, windowSizeMin, alertIntervalMin int, resendAPIKey, alertEmail string) *CacheDetector {
	detectorOnce.Do(func() {
		if !enabled {
			log.Printf("🔕 Cache fallback detection disabled")
			return
		}

		windowSize := time.Duration(windowSizeMin) * time.Minute
		alertInterval := time.Duration(alertIntervalMin) * time.Minute

		var resendClient ResendClient
		if resendAPIKey != "" {
			resendClient = &DefaultResendClient{
				apiKey: resendAPIKey,
				client: &http.Client{Timeout: 30 * time.Second},
			}
		} else {
			log.Printf("⚠️  RESEND_API_KEY not set, alerts will be logged only")
			resendClient = &DefaultResendClient{
				client: &http.Client{Timeout: 30 * time.Second},
			}
		}

		globalDetector = &CacheDetector{
			buffer:           NewEventBuffer(windowSize),
			errorBuffer:      NewErrorBuffer(windowSize),
			rateLimiter:      NewAlertRateLimiter(alertInterval),
			errorRateLimiter: NewAlertRateLimiter(alertInterval),
			resendClient:     resendClient,
			thresholdCount:   thresholdCount,
			errorThreshold:   errorThreshold,
			windowSize:       windowSize,
			enabled:          true,
			alertEmail:       alertEmail,
		}

		log.Printf("✅ Detection enabled: cache_threshold=%d, error_threshold=%d, window=%v, alert_interval=%v",
			thresholdCount, errorThreshold, windowSize, alertInterval)
	})
	return globalDetector
}

// RecordEvent records a potential cache fallback event
func (d *CacheDetector) RecordEvent(model string, inputTokens, cacheRead, cacheWrite int64) {
	if !d.enabled {
		return
	}

	// 1. Check if model supports cache
	if !d.modelSupportsCache(model) {
		return
	}

	// 2. Check if request is large enough to expect cache
	if inputTokens < 1024 {
		return
	}

	// 3. Check if cache tokens are zero
	if cacheRead > 0 || cacheWrite > 0 {
		return
	}

	// 4. Calculate estimated loss
	loss := d.calculateLoss(model, inputTokens)

	// 5. Create and store event
	event := CacheFallbackEvent{
		Timestamp:     time.Now(),
		Model:         model,
		InputTokens:   inputTokens,
		CacheRead:     cacheRead,
		CacheWrite:    cacheWrite,
		EstimatedLoss: loss,
	}

	d.buffer.AddEvent(event)
	log.Printf("⚠️  [Cache Fallback] Event recorded: model=%s tokens=%d loss=$%.4f", model, inputTokens, loss)

	// 6. Check if we should alert
	eventsInWindow := d.buffer.GetEventsInWindow()
	if len(eventsInWindow) >= d.thresholdCount {
		d.maybeSendAlert(eventsInWindow)
	}
}

// RecordError records a 500 error event from upstream
func (d *CacheDetector) RecordError(model string, statusCode int, errorMsg string) {
	if !d.enabled {
		return
	}

	// Only track 500 errors (server errors)
	if statusCode < 500 || statusCode >= 600 {
		return
	}

	// Create and store error event
	event := ErrorEvent{
		Timestamp:   time.Now(),
		Model:       model,
		StatusCode: statusCode,
		ErrorMsg:    errorMsg,
	}

	d.errorBuffer.AddErrorEvent(event)
	log.Printf("❌ [Upstream Error] Event recorded: model=%s status=%d error=%s", model, statusCode, errorMsg)

	// Check if we should alert
	errorsInWindow := d.errorBuffer.GetErrorsInWindow()
	if len(errorsInWindow) >= d.errorThreshold {
		d.maybeSendErrorAlert(errorsInWindow)
	}
}

// modelSupportsCache checks if a model supports prompt caching
func (d *CacheDetector) modelSupportsCache(model string) bool {
	cacheModels := []string{
		"claude-opus-4.5",
		"claude-sonnet-4.5",
		"claude-haiku-4.5",
	}
	for _, m := range cacheModels {
		if strings.Contains(model, m) {
			return true
		}
	}
	return false
}

// calculateLoss estimates the cost loss from not using cache
func (d *CacheDetector) calculateLoss(model string, inputTokens int64) float64 {
	// Cache hit price: $0.5/MTok (Opus), regular price: $15/MTok
	// Loss = (regular - cache) * tokens
	cachePrice := 0.5              // USD per MTok
	regularPrice := 15.0           // USD per MTok
	return (regularPrice - cachePrice) * (float64(inputTokens) / 1_000_000)
}

// maybeSendAlert checks rate limiter and sends alert if appropriate
func (d *CacheDetector) maybeSendAlert(events []CacheFallbackEvent) {
	// 1. Check rate limiter
	if !d.rateLimiter.ShouldSend() {
		log.Printf("⏸️  [Cache Fallback] Threshold reached but rate limited")
		return
	}

	// 2. Aggregate statistics
	totalLoss := 0.0
	modelCounts := make(map[string]int)
	for _, e := range events {
		totalLoss += e.EstimatedLoss
		modelCounts[e.Model]++
	}

	// 3. Send alert
	err := d.sendAlert(len(events), totalLoss, modelCounts)
	if err != nil {
		log.Printf("❌ Failed to send alert (will retry): %v", err)
		return
	}

	// 4. Clear buffer after successful alert
	d.buffer.Clear()
	log.Printf("✅ [Cache Fallback] Buffer cleared after successful alert")
}

// sendAlert constructs and sends the email alert
func (d *CacheDetector) sendAlert(eventCount int, totalLoss float64, modelCounts map[string]int) error {
	// Build model summary
	var modelSummary []string
	for model, count := range modelCounts {
		modelSummary = append(modelSummary, fmt.Sprintf("%s: %d requests", model, count))
	}

	// Use your verified domain
	from := "alerts@honeysocial.click"
	to := d.alertEmail
	if to == "" {
		to = os.Getenv("CACHE_FALLBACK_ALERT_EMAIL")
	}
	if to == "" {
		to = "trantai306@gmail.com" // default from proposal
	}

	subject := fmt.Sprintf("⚠️ OhMyGPT Cache Fallback: %d requests detected", eventCount)

	htmlBody := fmt.Sprintf(`
		<h2>⚠️ Multiple Cache Fallbacks Detected</h2>
		<p><strong>Time Window:</strong> Last %d minutes</p>
		<p><strong>Total Events:</strong> %d requests</p>
		<p><strong>Total Estimated Loss:</strong> $%.2f</p>

		<h3>Affected Models:</h3>
		<ul>
			%s
		</ul>

		<hr>
		<p><small>This is an automated alert from TrollLLM GoProxy</small></p>
	`,
		int(d.windowSize.Minutes()),
		eventCount,
		totalLoss,
		strings.Join(modelSummary, "\n			"),
	)

	err := d.resendClient.SendEmail(from, to, subject, htmlBody)
	if err != nil {
		return err
	}

	log.Printf("✅ [Cache Fallback] Alert sent: %d events, $%.2f loss", eventCount, totalLoss)
	d.rateLimiter.RecordSent()
	return nil
}

// maybeSendErrorAlert checks rate limiter and sends error alert if appropriate
func (d *CacheDetector) maybeSendErrorAlert(errors []ErrorEvent) {
	// 1. Check error rate limiter
	if !d.errorRateLimiter.ShouldSend() {
		log.Printf("⏸️  [Upstream Error] Threshold reached but rate limited")
		return
	}

	// 2. Aggregate statistics
	statusCounts := make(map[int]int)
	modelCounts := make(map[string]int)
	for _, e := range errors {
		statusCounts[e.StatusCode]++
		modelCounts[e.Model]++
	}

	// 3. Send alert
	err := d.sendErrorAlert(len(errors), statusCounts, modelCounts)
	if err != nil {
		log.Printf("❌ Failed to send error alert (will retry): %v", err)
		return
	}

	// 4. Clear buffer after successful alert
	d.errorBuffer.ClearErrors()
	log.Printf("✅ [Upstream Error] Error buffer cleared after successful alert")
}

// sendErrorAlert constructs and sends the error email alert
func (d *CacheDetector) sendErrorAlert(errorCount int, statusCounts map[int]int, modelCounts map[string]int) error {
	// Build summary
	var statusSummary []string
	for status, count := range statusCounts {
		statusSummary = append(statusSummary, fmt.Sprintf("HTTP %d: %d errors", status, count))
	}

	var modelSummary []string
	for model, count := range modelCounts {
		modelSummary = append(modelSummary, fmt.Sprintf("%s: %d errors", model, count))
	}

	// Use your verified domain
	from := "alerts@honeysocial.click"
	to := d.alertEmail
	if to == "" {
		to = os.Getenv("CACHE_FALLBACK_ALERT_EMAIL")
	}
	if to == "" {
		to = "trantai306@gmail.com"
	}

	subject := fmt.Sprintf("🚨 OhMyGPT Upstream Errors: %d errors detected", errorCount)

	htmlBody := fmt.Sprintf(`
		<h2>🚨 Multiple Upstream Errors Detected</h2>
		<p><strong>Time Window:</strong> Last %d minutes</p>
		<p><strong>Total Errors:</strong> %d requests</p>

		<h3>Status Codes:</h3>
		<ul>
			%s
		</ul>

		<h3>Affected Models:</h3>
		<ul>
			%s
		</ul>

		<hr>
		<p><small>This is an automated alert from TrollLLM GoProxy</small></p>
	`,
		int(d.windowSize.Minutes()),
		errorCount,
		strings.Join(statusSummary, "\n			"),
		strings.Join(modelSummary, "\n			"),
	)

	err := d.resendClient.SendEmail(from, to, subject, htmlBody)
	if err != nil {
		return err
	}

	log.Printf("✅ [Upstream Error] Alert sent: %d errors", errorCount)
	d.errorRateLimiter.RecordSent()
	return nil
}

