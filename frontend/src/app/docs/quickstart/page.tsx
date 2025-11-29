'use client'

import Link from 'next/link'
import { useState } from 'react'

// ===== SIDEBAR NAVIGATION =====
const sidebarNav = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quickstart', href: '/docs/quickstart', active: true },
      { title: 'Authentication', href: '/docs/authentication' },
    ]
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Chat Completions', href: '/docs/api/chat' },
      { title: 'Models', href: '/docs/api/models' },
      { title: 'Streaming', href: '/docs/api/streaming' },
    ]
  },
  {
    title: 'Integrations',
    items: [
      { title: 'Kilo Code', href: '/docs/integrations/kilo-code' },
      { title: 'Roo Code', href: '/docs/integrations/roo-code' },
      { title: 'Claude Code CLI', href: '/docs/integrations/claude-code' },
      { title: 'Droid', href: '/docs/integrations/droid' },
      { title: 'Cursor', href: '/docs/integrations/cursor' },
      { title: 'Continue', href: '/docs/integrations/continue' },
    ]
  },
  {
    title: 'Resources',
    items: [
      { title: 'Pricing', href: '/docs/pricing' },
      { title: 'Rate Limits', href: '/docs/rate-limits' },
      { title: 'Changelog', href: '/docs/changelog' },
    ]
  },
]

// ===== CODE BLOCK COMPONENT =====
function CodeBlock({
  code,
  language = 'bash',
  title
}: {
  code: string
  language?: string
  title?: string
}) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlightCode = (code: string, lang: string) => {
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    if (lang === 'python') {
      escaped = escaped
        .replace(/\b(from|import|def|class|return|if|else|elif|for|while|with|as|try|except|finally|raise|async|await|lambda|yield|break|continue|pass|None|True|False)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/("([^"]*)"|'([^']*)')/g, '<span class="text-emerald-400">$1</span>')
        .replace(/\b(OpenAI|Anthropic|client|response|chat|completions|create|messages|message|base_url|api_key|model|role|content|print|choices|max_tokens|baseURL|apiKey)\b/g, '<span class="text-blue-400">$1</span>')
        .replace(/(#.*$)/gm, '<span class="text-slate-500">$1</span>')
    } else if (lang === 'javascript' || lang === 'typescript') {
      escaped = escaped
        .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|import|export|default|class|extends|new|this|try|catch|finally|throw)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/("([^"]*)"|'([^']*)'|`([^`]*)`)/g, '<span class="text-emerald-400">$1</span>')
        .replace(/\b(OpenAI|Anthropic|client|response|chat|completions|create|messages|message|baseURL|apiKey|model|role|content|console|log|max_tokens)\b/g, '<span class="text-blue-400">$1</span>')
        .replace(/(\/\/.*$)/gm, '<span class="text-slate-500">$1</span>')
    } else if (lang === 'bash' || lang === 'shell') {
      escaped = escaped
        .replace(/^(curl|echo|export|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|node|npm|python|pip)\b/gm, '<span class="text-yellow-400">$1</span>')
        .replace(/\b(OPENAI_BASE_URL|OPENAI_API_KEY|ANTHROPIC_BASE_URL|ANTHROPIC_API_KEY|TROLLLLM_API_KEY)\b/g, '<span class="text-cyan-400">$1</span>')
    } else if (lang === 'json') {
      escaped = escaped
        .replace(/("([^"]*)")(\\s*:)/g, '<span class="text-cyan-400">$1</span>$2')
        .replace(/:\\s*("([^"]*)")/g, ': <span class="text-emerald-400">$1</span>')
        .replace(/\b(true|false|null)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>')
    } else if (lang === 'go') {
      escaped = escaped
        .replace(/\b(package|import|func|var|const|type|struct|interface|map|chan|return|if|else|for|range|switch|case|default|defer|go|select)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/("([^"]*)")/g, '<span class="text-emerald-400">$1</span>')
        .replace(/\b(http|json|fmt|os|bytes|NewRequest|NewBuffer|Marshal|Header|Set|Client|Do|Close|Decode|Println|Getenv)\b/g, '<span class="text-blue-400">$1</span>')
        .replace(/(\/\/.*$)/gm, '<span class="text-slate-500">$1</span>')
    }

    return escaped
  }

  return (
    <div className="rounded-xl border border-white/5 overflow-hidden mb-6">
      {title && (
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
          <span className="text-slate-500 text-xs font-medium">{title}</span>
          <span className="text-slate-600 text-xs">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 bg-[#0a0a0a] overflow-x-auto">
          <code
            className="text-sm text-slate-300 font-mono"
            dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
          />
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-3 right-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all"
        >
          {copied ? (
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ===== TABBED CODE BLOCK =====
function TabbedCodeBlock({
  tabs
}: {
  tabs: Array<{ label: string; language: string; code: string }>
}) {
  const [activeTab, setActiveTab] = useState(0)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tabs[activeTab].code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlightCode = (code: string, lang: string) => {
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    if (lang === 'python') {
      escaped = escaped
        .replace(/\b(from|import|def|class|return|if|else|elif|for|while|with|as|try|except|finally|raise|async|await|lambda|yield|break|continue|pass|None|True|False)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/(\"[^\"]*\"|'[^']*')/g, '<span class="text-emerald-400">$1</span>')
        .replace(/\b(OpenAI|Anthropic|client|response|chat|completions|create|messages|message|base_url|api_key|model|role|content|print|choices|max_tokens|baseURL|apiKey)\b/g, '<span class="text-blue-400">$1</span>')
        .replace(/(#.*$)/gm, '<span class="text-slate-500">$1</span>')
    } else if (lang === 'javascript' || lang === 'typescript') {
      escaped = escaped
        .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|import|export|default|class|extends|new|this|try|catch|finally|throw)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/(\"[^\"]*\"|'[^']*'|`[^`]*`)/g, '<span class="text-emerald-400">$1</span>')
        .replace(/\b(OpenAI|Anthropic|client|response|chat|completions|create|messages|message|baseURL|apiKey|model|role|content|console|log|max_tokens)\b/g, '<span class="text-blue-400">$1</span>')
        .replace(/(\/\/.*$)/gm, '<span class="text-slate-500">$1</span>')
    } else if (lang === 'bash' || lang === 'shell') {
      escaped = escaped
        .replace(/^(curl|echo|export|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|node|npm|python|pip)\b/gm, '<span class="text-yellow-400">$1</span>')
        .replace(/\b(OPENAI_BASE_URL|OPENAI_API_KEY|ANTHROPIC_BASE_URL|ANTHROPIC_API_KEY|TROLLLLM_API_KEY)\b/g, '<span class="text-cyan-400">$1</span>')
    } else if (lang === 'json') {
      escaped = escaped
        .replace(/(\"[^\"]*\")(\\s*:)/g, '<span class="text-cyan-400">$1</span>$2')
        .replace(/:\\s*(\"[^\"]*\")/g, ': <span class="text-emerald-400">$1</span>')
        .replace(/\b(true|false|null)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>')
    } else if (lang === 'go') {
      escaped = escaped
        .replace(/\b(package|import|func|var|const|type|struct|interface|map|chan|return|if|else|for|range|switch|case|default|defer|go|select)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/(\"[^\"]*\")/g, '<span class="text-emerald-400">$1</span>')
        .replace(/\b(http|json|fmt|os|bytes|NewRequest|NewBuffer|Marshal|Header|Set|Client|Do|Close|Decode|Println|Getenv)\b/g, '<span class="text-blue-400">$1</span>')
        .replace(/(\/\/.*$)/gm, '<span class="text-slate-500">$1</span>')
    }

    return escaped
  }

  return (
    <div className="rounded-xl border border-white/5 overflow-hidden mb-6">
      <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
        <div className="flex gap-1">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === i
                  ? 'bg-white/10 text-white'
                  : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-slate-600 text-xs">{tabs[activeTab].language}</span>
      </div>
      <div className="relative">
        <pre className="p-4 bg-[#0a0a0a] overflow-x-auto">
          <code
            className="text-sm text-slate-300 font-mono"
            dangerouslySetInnerHTML={{ __html: highlightCode(tabs[activeTab].code, tabs[activeTab].language) }}
          />
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-3 right-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all"
        >
          {copied ? (
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ===== NOTE COMPONENT =====
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

// ===== WARNING COMPONENT =====
function Warning({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h4 className="text-amber-400 font-medium text-sm mb-1">{title}</h4>
          <div className="text-slate-400 text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ===== STEP COMPONENT =====
function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative pl-12 pb-8 border-l border-white/10 last:border-0 last:pb-0" id={`step-${number}`}>
      <div className="absolute left-0 -translate-x-1/2 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-sm font-medium">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      <div className="text-slate-400">{children}</div>
    </div>
  )
}

// ===== CARD COMPONENT =====
function Card({
  title,
  description,
  href,
  icon
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:border-white/20 transition-all mb-4">
        {icon}
      </div>
      <h3 className="text-white font-medium mb-1 group-hover:text-white/90">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </Link>
  )
}

// ===== API FORMAT SELECTOR =====
function APIFormatSelector() {
  const [format, setFormat] = useState<'openai' | 'anthropic'>('openai')
  const [copied, setCopied] = useState(false)

  const configs = {
    openai: {
      baseUrl: 'https://chat.trollllm.xyz/v1',
      envVars: `OPENAI_BASE_URL=https://chat.trollllm.xyz/v1
OPENAI_API_KEY=your-api-key`,
      description: 'Compatible with OpenAI SDK and tools that support custom base URLs.'
    },
    anthropic: {
      baseUrl: 'https://chat.trollllm.xyz',
      envVars: `ANTHROPIC_BASE_URL=https://chat.trollllm.xyz
ANTHROPIC_API_KEY=your-api-key`,
      description: 'Native Anthropic format for Claude-specific features and tools.'
    }
  }

  const config = configs[format]

  const copyToClipboard = () => {
    navigator.clipboard.writeText(config.envVars)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-6">
      {/* Format Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFormat('openai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
            format === 'openai'
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:border-white/10'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
          </svg>
          <span className="font-medium">OpenAI Format</span>
        </button>
        <button
          onClick={() => setFormat('anthropic')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
            format === 'anthropic'
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:border-white/10'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0H10.172L16.74 20.48h-3.603l-1.283-3.36H5.697l-1.283 3.36H.852L6.569 3.52zm.831 10.56h4.097L9.447 8.12l-2.047 5.96z"/>
          </svg>
          <span className="font-medium">Anthropic Format</span>
        </button>
      </div>

      {/* Config Display */}
      <p className="text-slate-400 text-sm mb-4">{config.description}</p>

      <div className="rounded-xl border border-white/5 overflow-hidden">
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
          <span className="text-slate-500 text-xs font-medium">Environment Variables</span>
          <span className="text-slate-600 text-xs">.env</span>
        </div>
        <div className="relative">
          <pre className="p-4 bg-[#0a0a0a] overflow-x-auto">
            <code className="text-sm text-slate-300 font-mono">{config.envVars}</code>
          </pre>
          <button
            onClick={copyToClipboard}
            className="absolute top-3 right-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all"
          >
            {copied ? (
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== MAIN PAGE =====
export default function QuickstartPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const openaiExamples = {
    curl: `curl https://chat.trollllm.xyz/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello! What can you help me with?"}
    ]
  }'`,
    python: `from openai import OpenAI

client = OpenAI(
    base_url="https://chat.trollllm.xyz/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Hello! What can you help me with?"}
    ]
)

print(response.choices[0].message.content)`,
    javascript: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://chat.trollllm.xyz/v1',
  apiKey: 'your-api-key'
});

const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello! What can you help me with?' }
  ]
});

console.log(response.choices[0].message.content);`,
    go: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
)

func main() {
    url := "https://chat.trollllm.xyz/v1/chat/completions"

    payload := map[string]interface{}{
        "model": "gpt-4",
        "messages": []map[string]string{
            {"role": "user", "content": "Hello! What can you help me with?"},
        },
    }

    jsonData, _ := json.Marshal(payload)
    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+os.Getenv("OPENAI_API_KEY"))

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Println(result)
}`
  }

  const anthropicExamples = {
    curl: `curl https://chat.trollllm.xyz/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-sonnet-4-5-20250514",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello! What can you help me with?"}
    ]
  }'`,
    python: `import anthropic

client = anthropic.Anthropic(
    base_url="https://chat.trollllm.xyz",
    api_key="your-api-key"
)

message = client.messages.create(
    model="claude-sonnet-4-5-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello! What can you help me with?"}
    ]
)

print(message.content[0].text)`,
    javascript: `import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'https://chat.trollllm.xyz',
  apiKey: 'your-api-key'
});

const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250514',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Hello! What can you help me with?' }
  ]
});

console.log(message.content[0].text);`,
    go: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
)

func main() {
    url := "https://chat.trollllm.xyz/v1/messages"

    payload := map[string]interface{}{
        "model": "claude-sonnet-4-5-20250514",
        "max_tokens": 1024,
        "messages": []map[string]string{
            {"role": "user", "content": "Hello! What can you help me with?"},
        },
    }

    jsonData, _ := json.Marshal(payload)
    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", os.Getenv("ANTHROPIC_API_KEY"))
    req.Header.Set("anthropic-version", "2023-06-01")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Println(result)
}`
  }

  const [apiFormat, setApiFormat] = useState<'openai' | 'anthropic'>('openai')
  const examples = apiFormat === 'openai' ? openaiExamples : anthropicExamples

  const expectedResponse = apiFormat === 'openai'
    ? `{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1701234567,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm Claude, an AI assistant. I can help you with..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 45,
    "total_tokens": 57
  }
}`
    : `{
  "id": "msg_abc123",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4-5-20250514",
  "content": [
    {
      "type": "text",
      "text": "Hello! I'm Claude, an AI assistant. I can help you with..."
    }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 12,
    "output_tokens": 45
  }
}`

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-semibold text-white">
              TrollLLM
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 text-sm">Documentation</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-500 hover:text-white transition-colors text-sm">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-slate-200 transition-colors">
              Get API Key
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex pt-[65px]">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 right-6 z-50 lg:hidden w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-[65px] left-0 z-40 w-72 h-[calc(100vh-65px)] bg-black lg:bg-transparent border-r border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-6">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search docs..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-white/10 transition-colors"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white/5 text-slate-600 text-xs font-mono">⌘K</kbd>
            </div>

            {/* Navigation */}
            <nav className="space-y-6">
              {sidebarNav.map((section) => (
                <div key={section.title}>
                  <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">{section.title}</h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            item.active
                              ? 'bg-white/10 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-12">
          <div className="max-w-3xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
              <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
              <span>/</span>
              <span className="text-slate-400">Quickstart</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-white mb-4">Quickstart</h1>
            <p className="text-lg text-slate-400 mb-8">
              Get up and running with TrollLLM in just a few minutes. Follow these steps to make your first API call.
            </p>

            <Note>
              You&apos;ll need an API key to follow this guide. If you don&apos;t have one yet, <Link href="/register" className="text-sky-400 hover:underline">create a free account</Link> to get started.
            </Note>

            {/* Steps */}
            <div className="mt-10">
              <Step number={1} title="Get Your API Key">
                <p className="mb-4">
                  After creating your account, navigate to the dashboard and copy your API key.
                  Export it as an environment variable for use in your applications.
                </p>
                <CodeBlock
                  code="export TROLLLLM_API_KEY=your-api-key-here"
                  language="bash"
                  title="Terminal"
                />
                <p className="text-sm text-slate-500">
                  For detailed authentication options, see our <Link href="/docs/authentication" className="text-sky-400 hover:underline">Authentication Guide</Link>.
                </p>
              </Step>

              <Step number={2} title="Choose Your API Format">
                <p className="mb-4">
                  TrollLLM supports two API formats. Choose based on your existing tools and preferences:
                </p>

                {/* Format Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setApiFormat('openai')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                      apiFormat === 'openai'
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
                    </svg>
                    <span className="font-medium">OpenAI Format</span>
                  </button>
                  <button
                    onClick={() => setApiFormat('anthropic')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                      apiFormat === 'anthropic'
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0H10.172L16.74 20.48h-3.603l-1.283-3.36H5.697l-1.283 3.36H.852L6.569 3.52zm.831 10.56h4.097L9.447 8.12l-2.047 5.96z"/>
                    </svg>
                    <span className="font-medium">Anthropic Format</span>
                  </button>
                </div>

                <p className="text-slate-400 text-sm mb-4">
                  {apiFormat === 'openai'
                    ? 'Compatible with OpenAI SDK and tools that support custom base URLs.'
                    : 'Native Anthropic format for Claude-specific features and tools.'}
                </p>

                <CodeBlock
                  code={apiFormat === 'openai'
                    ? `OPENAI_BASE_URL=https://chat.trollllm.xyz/v1
OPENAI_API_KEY=your-api-key`
                    : `ANTHROPIC_BASE_URL=https://chat.trollllm.xyz
ANTHROPIC_API_KEY=your-api-key`}
                  language="bash"
                  title=".env"
                />
              </Step>

              <Step number={3} title="Make Your First Request">
                <p className="mb-4">
                  Use your preferred language or tool to make your first API call:
                </p>
                <TabbedCodeBlock
                  tabs={[
                    { label: 'cURL', language: 'bash', code: examples.curl },
                    { label: 'Python', language: 'python', code: examples.python },
                    { label: 'JavaScript', language: 'javascript', code: examples.javascript },
                    { label: 'Go', language: 'go', code: examples.go },
                  ]}
                />
              </Step>

              <Step number={4} title="Verify Your Setup">
                <p className="mb-4">
                  If everything is configured correctly, you should receive a response like this:
                </p>
                <CodeBlock
                  code={expectedResponse}
                  language="json"
                  title="Expected Response"
                />
              </Step>
            </div>

            {/* Divider */}
            <hr className="border-white/5 my-10" />

            {/* Next steps */}
            <h2 className="text-2xl font-semibold text-white mb-6">Next Steps</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <Card
                title="Authentication"
                description="Learn about API keys, tokens, and secure authentication methods."
                href="/docs/authentication"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                }
              />
              <Card
                title="OpenAI API Docs"
                description="Full reference for the OpenAI-compatible API format."
                href="/docs/api/chat"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                }
              />
              <Card
                title="Anthropic API Docs"
                description="Full reference for the native Anthropic API format."
                href="/docs/api/anthropic"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                }
              />
              <Card
                title="Best Practices"
                description="Tips and best practices for using TrollLLM effectively."
                href="/docs/best-practices"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                }
              />
            </div>

            {/* Common Issues */}
            <h2 className="text-2xl font-semibold text-white mb-6">Common Issues</h2>
            <Warning title="Rate Limiting">
              If you&apos;re receiving 429 errors, you may be hitting rate limits.
              Check our <Link href="/docs/rate-limits" className="text-amber-400 hover:underline">Rate Limits documentation</Link> for details.
            </Warning>
            <Warning title="Authentication Failed">
              Make sure your API key is correct and has not expired.
              See the <Link href="/docs/authentication" className="text-amber-400 hover:underline">Authentication Guide</Link> for troubleshooting.
            </Warning>

            {/* Footer navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-white/5">
              <Link href="/docs" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Introduction</span>
              </Link>
              <Link href="/docs/authentication" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <span>Authentication</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </main>

        {/* Table of contents (right sidebar) */}
        <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto border-l border-white/5 p-6">
          <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">On this page</h3>
          <nav className="space-y-2">
            <a href="#" className="block text-sm text-white">Quickstart</a>
            <a href="#step-1" className="block text-sm text-slate-500 hover:text-white transition-colors pl-3">1. Get Your API Key</a>
            <a href="#step-2" className="block text-sm text-slate-500 hover:text-white transition-colors pl-3">2. Choose Your API Format</a>
            <a href="#step-3" className="block text-sm text-slate-500 hover:text-white transition-colors pl-3">3. Make Your First Request</a>
            <a href="#step-4" className="block text-sm text-slate-500 hover:text-white transition-colors pl-3">4. Verify Your Setup</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Next Steps</a>
            <a href="#" className="block text-sm text-slate-500 hover:text-white transition-colors">Common Issues</a>
          </nav>
        </aside>
      </div>
    </div>
  )
}
