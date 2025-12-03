package bufpool

import (
	"bufio"
	"bytes"
	"sync"
)

// Buffer sizes
const (
	SmallBufferSize  = 64 * 1024        // 64KB for small responses
	MediumBufferSize = 256 * 1024       // 256KB for medium responses
	LargeBufferSize  = 1024 * 1024      // 1MB for streaming
	MaxBufferSize    = 10 * 1024 * 1024 // 10MB max
)

// Buffer pools for different sizes
var (
	smallBufPool = sync.Pool{
		New: func() interface{} {
			return make([]byte, SmallBufferSize)
		},
	}

	mediumBufPool = sync.Pool{
		New: func() interface{} {
			return make([]byte, MediumBufferSize)
		},
	}

	largeBufPool = sync.Pool{
		New: func() interface{} {
			return make([]byte, LargeBufferSize)
		},
	}

	bytesBufferPool = sync.Pool{
		New: func() interface{} {
			return new(bytes.Buffer)
		},
	}

	scannerPool = sync.Pool{
		New: func() interface{} {
			return &ScannerWrapper{}
		},
	}
)

// GetSmallBuffer gets a small buffer from the pool
func GetSmallBuffer() []byte {
	return smallBufPool.Get().([]byte)
}

// PutSmallBuffer returns a small buffer to the pool
func PutSmallBuffer(buf []byte) {
	if cap(buf) == SmallBufferSize {
		smallBufPool.Put(buf[:SmallBufferSize])
	}
}

// GetMediumBuffer gets a medium buffer from the pool
func GetMediumBuffer() []byte {
	return mediumBufPool.Get().([]byte)
}

// PutMediumBuffer returns a medium buffer to the pool
func PutMediumBuffer(buf []byte) {
	if cap(buf) == MediumBufferSize {
		mediumBufPool.Put(buf[:MediumBufferSize])
	}
}

// GetLargeBuffer gets a large buffer from the pool (for streaming)
func GetLargeBuffer() []byte {
	return largeBufPool.Get().([]byte)
}

// PutLargeBuffer returns a large buffer to the pool
func PutLargeBuffer(buf []byte) {
	if cap(buf) == LargeBufferSize {
		largeBufPool.Put(buf[:LargeBufferSize])
	}
}

// GetBytesBuffer gets a bytes.Buffer from the pool
func GetBytesBuffer() *bytes.Buffer {
	buf := bytesBufferPool.Get().(*bytes.Buffer)
	buf.Reset()
	return buf
}

// PutBytesBuffer returns a bytes.Buffer to the pool
func PutBytesBuffer(buf *bytes.Buffer) {
	// Only return buffers that haven't grown too large
	if buf.Cap() <= MaxBufferSize {
		buf.Reset()
		bytesBufferPool.Put(buf)
	}
}

// ScannerWrapper wraps a bufio.Scanner with pooled buffer
type ScannerWrapper struct {
	Scanner *bufio.Scanner
	buffer  []byte
}

// GetScanner gets a scanner wrapper from the pool
func GetScanner() *ScannerWrapper {
	sw := scannerPool.Get().(*ScannerWrapper)
	if sw.buffer == nil {
		sw.buffer = make([]byte, LargeBufferSize)
	}
	return sw
}

// PutScanner returns a scanner wrapper to the pool
func PutScanner(sw *ScannerWrapper) {
	sw.Scanner = nil
	scannerPool.Put(sw)
}

// SetupScanner configures the scanner for the given reader
func (sw *ScannerWrapper) SetupForReader(r interface{ Read([]byte) (int, error) }) *bufio.Scanner {
	sw.Scanner = bufio.NewScanner(r)
	sw.Scanner.Buffer(sw.buffer, MaxBufferSize)
	return sw.Scanner
}

// BufferPool provides a generic buffer pooling interface
type BufferPool struct {
	pool sync.Pool
	size int
}

// NewBufferPool creates a new buffer pool with the specified size
func NewBufferPool(size int) *BufferPool {
	return &BufferPool{
		pool: sync.Pool{
			New: func() interface{} {
				return make([]byte, size)
			},
		},
		size: size,
	}
}

// Get retrieves a buffer from the pool
func (p *BufferPool) Get() []byte {
	return p.pool.Get().([]byte)
}

// Put returns a buffer to the pool
func (p *BufferPool) Put(buf []byte) {
	if cap(buf) == p.size {
		p.pool.Put(buf[:p.size])
	}
}
