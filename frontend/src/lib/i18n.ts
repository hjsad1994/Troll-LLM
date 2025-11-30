export type Language = 'en' | 'vi'

export const translations = {
  en: {
    // Header
    nav: {
      models: 'Models',
      features: 'Features',
      pricing: 'Pricing',
      faq: 'FAQ',
      signIn: 'Sign In',
      getApiKey: 'Get API Key',
      dashboard: 'Dashboard',
      documentation: 'Documentation',
      signOut: 'Sign Out',
    },
    // Hero Section
    hero: {
      badge: 'Opus 4.5 Available',
      title1: 'Access Opus 4.5',
      title2: 'with One API Key',
      description: 'Premium access to Claude models. Access Opus, Sonnet, and Haiku through a single API.',
      cta: 'Get Started',
    },
    // Stats
    stats: {
      models: 'Models',
      uptime: 'Uptime',
      latency: 'Latency',
      context: 'Context',
    },
    // Features
    features: {
      title: 'Built for developers',
      subtitle: 'Everything you need to integrate AI into your applications.',
      feature1: {
        title: 'One API, All Models',
        description: 'Access Claude Opus, Sonnet, and Haiku through a single unified API endpoint.',
      },
      feature2: {
        title: 'Smart Fallbacks',
        description: 'Automatic failover between models. Requests seamlessly route when needed.',
      },
      feature3: {
        title: 'Real-Time Analytics',
        description: 'Track usage, monitor costs, and analyze performance across all operations.',
      },
    },
    // Pricing
    pricing: {
      title: 'Choose Your Plan',
      subtitle: 'Simple, transparent pricing. No hidden fees. Cancel anytime.',
      dev: {
        badge: 'DEVELOPER',
        name: 'Dev',
        description: 'Perfect for side projects',
        save: 'Save 14,000 VND',
        features: {
          requests: '300 requests/minute',
          credits: '225 credits/month',
          models: 'All Claude models',
          support: 'Community support',
        },
        cta: 'Join Discord',
      },
      pro: {
        badge: 'PROFESSIONAL',
        popular: 'MOST POPULAR',
        name: 'Pro',
        description: 'Best for teams & production',
        save: 'Save 36,000 VND',
        features: {
          requests: '1000 requests/minute',
          credits: '500 credits/month',
          models: 'All Claude models',
          support: 'Priority support',
        },
        cta: 'Join Discord',
      },
      compareAll: 'Compare all features',
    },
    // FAQ
    faq: {
      title: 'FAQ',
      q1: {
        question: 'How does pricing work?',
        answer: 'Pay-as-you-go with transparent per-token rates. No monthly minimums. Volume discounts available.',
      },
      q2: {
        question: 'Which Claude models are supported?',
        answer: 'We support Claude Opus 4.5, Claude Sonnet 4.5, and Claude Haiku 4.5 - the latest and most capable Claude models from Anthropic.',
      },
      q3: {
        question: 'Is my data secure?',
        answer: 'Zero-log policy. All data encrypted in transit and at rest. SOC 2 Type II compliant.',
      },
      q4: {
        question: 'Can I use existing Anthropic SDK code?',
        answer: "Yes! Our API is fully compatible with the Anthropic SDK. Just change the base URL and you're ready to go.",
      },
    },
    // CTA
    cta: {
      title: 'Ready to start?',
      subtitle: 'Check out our documentation to get started with the API.',
      button: 'View Documentation',
    },
    // Footer
    footer: {
      privacy: 'Privacy',
      terms: 'Terms',
      discord: 'Discord',
    },
    // Language
    language: {
      en: 'English',
      vi: 'Tiếng Việt',
    },
  },
  vi: {
    // Header
    nav: {
      models: 'Mô hình',
      features: 'Tính năng',
      pricing: 'Bảng giá',
      faq: 'Hỏi đáp',
      signIn: 'Đăng nhập',
      getApiKey: 'Lấy API Key',
      dashboard: 'Bảng điều khiển',
      documentation: 'Tài liệu',
      signOut: 'Đăng xuất',
    },
    // Hero Section
    hero: {
      badge: 'Opus 4.5 Đã có sẵn',
      title1: 'Truy cập Opus 4.5',
      title2: 'chỉ với Một API Key',
      description: 'Truy cập cao cấp các mô hình Claude. Sử dụng Opus, Sonnet và Haiku thông qua một API duy nhất.',
      cta: 'Bắt đầu ngay',
    },
    // Stats
    stats: {
      models: 'Mô hình',
      uptime: 'Thời gian hoạt động',
      latency: 'Độ trễ',
      context: 'Ngữ cảnh',
    },
    // Features
    features: {
      title: 'Xây dựng cho lập trình viên',
      subtitle: 'Mọi thứ bạn cần để tích hợp AI vào ứng dụng của bạn.',
      feature1: {
        title: 'Một API, Tất cả Mô hình',
        description: 'Truy cập Claude Opus, Sonnet và Haiku thông qua một endpoint API thống nhất.',
      },
      feature2: {
        title: 'Chuyển đổi Thông minh',
        description: 'Tự động chuyển đổi giữa các mô hình. Yêu cầu được định tuyến liền mạch khi cần.',
      },
      feature3: {
        title: 'Phân tích Thời gian thực',
        description: 'Theo dõi mức sử dụng, giám sát chi phí và phân tích hiệu suất trên tất cả hoạt động.',
      },
    },
    // Pricing
    pricing: {
      title: 'Chọn Gói của Bạn',
      subtitle: 'Giá cả đơn giản, minh bạch. Không có phí ẩn. Hủy bất cứ lúc nào.',
      dev: {
        badge: 'DEVELOPER',
        name: 'Dev',
        description: 'Hoàn hảo cho dự án cá nhân',
        save: 'Tiết kiệm 14,000 VND',
        features: {
          requests: '300 yêu cầu/phút',
          credits: '225 credits/tháng',
          models: 'Tất cả mô hình Claude',
          support: 'Hỗ trợ cộng đồng',
        },
        cta: 'Tham gia Discord',
      },
      pro: {
        badge: 'CHUYÊN NGHIỆP',
        popular: 'PHỔ BIẾN NHẤT',
        name: 'Pro',
        description: 'Tốt nhất cho đội nhóm & production',
        save: 'Tiết kiệm 36,000 VND',
        features: {
          requests: '1000 yêu cầu/phút',
          credits: '500 credits/tháng',
          models: 'Tất cả mô hình Claude',
          support: 'Hỗ trợ ưu tiên',
        },
        cta: 'Tham gia Discord',
      },
      compareAll: 'So sánh tất cả tính năng',
    },
    // FAQ
    faq: {
      title: 'Câu hỏi thường gặp',
      q1: {
        question: 'Giá cả hoạt động như thế nào?',
        answer: 'Thanh toán theo mức sử dụng với giá token minh bạch. Không có mức tối thiểu hàng tháng. Có giảm giá cho số lượng lớn.',
      },
      q2: {
        question: 'Những mô hình Claude nào được hỗ trợ?',
        answer: 'Chúng tôi hỗ trợ Claude Opus 4.5, Claude Sonnet 4.5 và Claude Haiku 4.5 - các mô hình Claude mới nhất và mạnh nhất từ Anthropic.',
      },
      q3: {
        question: 'Dữ liệu của tôi có an toàn không?',
        answer: 'Chính sách không lưu log. Tất cả dữ liệu được mã hóa khi truyền và lưu trữ. Tuân thủ SOC 2 Type II.',
      },
      q4: {
        question: 'Tôi có thể sử dụng code SDK Anthropic hiện có không?',
        answer: 'Có! API của chúng tôi hoàn toàn tương thích với Anthropic SDK. Chỉ cần thay đổi base URL và bạn đã sẵn sàng.',
      },
    },
    // CTA
    cta: {
      title: 'Sẵn sàng bắt đầu?',
      subtitle: 'Xem tài liệu của chúng tôi để bắt đầu với API.',
      button: 'Xem Tài liệu',
    },
    // Footer
    footer: {
      privacy: 'Quyền riêng tư',
      terms: 'Điều khoản',
      discord: 'Discord',
    },
    // Language
    language: {
      en: 'English',
      vi: 'Tiếng Việt',
    },
  },
}

export type TranslationKey = keyof typeof translations.en
