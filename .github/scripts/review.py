#!/usr/bin/env python3
"""
AI Code Review Script
Sends code diff to LLM API for comprehensive code review
"""

import os
import requests
import json

def read_diff():
    """Read the git diff file"""
    try:
        with open('diff.txt', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""

def get_system_prompt():
    """Return the system prompt for the AI reviewer"""
    return """Bạn là một Senior Software Engineer với hơn 15 năm kinh nghiệm trong việc review code. Bạn đã làm việc tại các công ty công nghệ hàng đầu và có kiến thức sâu rộng về:

- Clean Code và SOLID principles
- Design Patterns và Software Architecture
- Security best practices (OWASP Top 10)
- Performance optimization
- Testing strategies
- DevOps và CI/CD

Nhiệm vụ của bạn là review code một cách NGHIÊM KHẮC nhưng MANG TÍNH XÂY DỰNG. Bạn phải:
1. Phát hiện mọi vấn đề tiềm ẩn, dù nhỏ nhất
2. Giải thích RÕ RÀNG tại sao đó là vấn đề
3. Đưa ra giải pháp CỤ THỂ với code example
4. Đánh giá khách quan, không nể nang

Bạn KHÔNG được bỏ qua bất kỳ vấn đề nào. Nếu code tốt, hãy khen ngợi cụ thể điểm tốt."""

def get_review_prompt(diff: str, pr_title: str, pr_body: str):
    """Generate the detailed review prompt"""
    return f"""# PULL REQUEST CẦN REVIEW

## Thông tin PR
- **Tiêu đề:** {pr_title or 'Không có tiêu đề'}
- **Mô tả:** {pr_body or 'Không có mô tả'}

## Code Changes (Diff)
```diff
{diff}
```

---

# YÊU CẦU REVIEW CHI TIẾT

Hãy phân tích code changes ở trên và đưa ra review theo format sau:

## 1. 📋 TÓM TẮT THAY ĐỔI
- Mô tả ngắn gọn những gì PR này làm
- Liệt kê các file được thay đổi và mục đích của từng thay đổi
- Đánh giá scope của PR (quá lớn? quá nhỏ? phù hợp?)

## 2. 🔴 LỖI NGHIÊM TRỌNG (Critical Issues)
Các vấn đề BẮT BUỘC phải sửa trước khi merge:
- **Bugs**: Logic errors, null pointer, race conditions, infinite loops
- **Security vulnerabilities**: SQL Injection, XSS, CSRF, hardcoded secrets, insecure deserialization
- **Data loss risks**: Incorrect database operations, missing transactions
- **Breaking changes**: API compatibility issues

Format cho mỗi issue:
```
❌ [TÊN VẤN ĐỀ]
📍 Vị trí: [file:line]
🔍 Mô tả: [Chi tiết vấn đề]
💥 Impact: [Hậu quả nếu không sửa]
✅ Giải pháp:
[Code example để fix]
```

## 3. 🟠 VẤN ĐỀ CẦN CẢI THIỆN (Major Issues)
Các vấn đề NÊN sửa để code tốt hơn:
- **Performance**: N+1 queries, unnecessary loops, memory leaks, missing indexes
- **Error handling**: Missing try-catch, swallowed exceptions, unclear error messages
- **Code duplication**: DRY violations, copy-paste code
- **Architecture**: Tight coupling, circular dependencies, wrong layer responsibilities

## 4. 🟡 GỢI Ý CẢI THIỆN (Minor Issues)
Các vấn đề nhỏ, nice-to-have:
- **Code style**: Naming conventions, formatting, magic numbers
- **Readability**: Complex expressions, missing comments for tricky logic
- **Best practices**: Language-specific idioms, framework conventions

## 5. 🔒 SECURITY CHECKLIST
Đánh dấu các mục đã kiểm tra:
- [ ] Input validation đầy đủ
- [ ] Output encoding/escaping
- [ ] Authentication/Authorization checks
- [ ] Sensitive data không bị log/expose
- [ ] SQL queries được parameterized
- [ ] File uploads được validate
- [ ] Rate limiting cho API endpoints
- [ ] CORS configuration đúng

## 6. ⚡ PERFORMANCE REVIEW
- Có potential bottleneck nào không?
- Database queries có được optimize?
- Có unnecessary computations?
- Caching có được sử dụng đúng?
- Memory usage có hợp lý?

## 7. 🧪 TESTING CONSIDERATIONS
- Code mới có cần unit tests không?
- Có test cases nào bị thiếu?
- Edge cases nào cần được cover?
- Integration tests có cần update?

## 8. 📚 CODE QUALITY METRICS
Đánh giá theo thang điểm 1-5:
| Tiêu chí | Điểm | Nhận xét |
|----------|------|----------|
| Readability | ?/5 | ... |
| Maintainability | ?/5 | ... |
| Testability | ?/5 | ... |
| Security | ?/5 | ... |
| Performance | ?/5 | ... |
| **TỔNG** | ?/25 | ... |

## 9. ✨ ĐIỂM TỐT (What's Good)
Liệt kê những điểm code làm tốt, cần được duy trì:
- ...

## 10. 📝 VERDICT (Kết luận)

**Trạng thái:** [Chọn 1 trong các option sau]
- ✅ **APPROVED** - Code tốt, có thể merge ngay
- ✅ **APPROVED với minor comments** - Có thể merge, author tự fix các minor issues
- 🔄 **REQUEST CHANGES** - Cần sửa các issues được đề cập trước khi merge
- ❓ **NEEDS DISCUSSION** - Cần thảo luận thêm về approach/architecture

**Tóm tắt:**
[2-3 câu tóm tắt overall review]

**Action items cho author:**
1. ...
2. ...
3. ...

---
*Review được thực hiện bởi AI Code Reviewer. Vui lòng liên hệ team lead nếu có thắc mắc.*"""

def call_llm_api(diff: str, pr_title: str, pr_body: str) -> str:
    """Call the LLM API for code review"""
    api_key = os.environ.get('API_KEY')
    api_endpoint = os.environ.get('API_ENDPOINT', 'https://chat.trollllm.xyz')
    model_name = os.environ.get('MODEL_NAME', 'gpt-4o-mini')

    if not api_key:
        return "Error: API_KEY not configured"

    # Ensure endpoint ends properly
    if not api_endpoint.endswith('/v1/chat/completions'):
        api_endpoint = api_endpoint.rstrip('/') + '/v1/chat/completions'

    # Truncate diff if too long (to fit within context limits)
    max_diff_length = 20000
    if len(diff) > max_diff_length:
        diff = diff[:max_diff_length] + "\n\n... (diff truncated due to length - chỉ hiển thị " + str(max_diff_length) + " ký tự đầu)"

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }

    payload = {
        'model': model_name,
        'messages': [
            {
                'role': 'system',
                'content': get_system_prompt()
            },
            {
                'role': 'user',
                'content': get_review_prompt(diff, pr_title, pr_body)
            }
        ],
        'max_tokens': 4000,
        'temperature': 0.2  # Lower temperature for more consistent, focused reviews
    }

    try:
        response = requests.post(
            api_endpoint,
            headers=headers,
            json=payload,
            timeout=180  # Longer timeout for detailed review
        )
        response.raise_for_status()

        result = response.json()
        return result['choices'][0]['message']['content']

    except requests.exceptions.Timeout:
        return "⚠️ Error: API request timed out. The diff might be too large."
    except requests.exceptions.RequestException as e:
        return f"⚠️ Error calling API: {str(e)}"
    except (KeyError, IndexError) as e:
        return f"⚠️ Error parsing API response: {str(e)}"

def main():
    """Main function"""
    diff = read_diff()

    if not diff.strip():
        review = """## 📋 AI Code Review

⚠️ **Không phát hiện thay đổi code nào trong PR này.**

Có thể do:
- PR chỉ chứa thay đổi về documentation
- Các file thay đổi bị ignore
- Lỗi khi lấy diff

Vui lòng kiểm tra lại PR."""
    else:
        pr_title = os.environ.get('PR_TITLE', '')
        pr_body = os.environ.get('PR_BODY', '')
        review = call_llm_api(diff, pr_title, pr_body)

    # Write result to file
    with open('review_result.md', 'w', encoding='utf-8') as f:
        f.write(review)

    print("Review completed successfully!")
    print("-" * 50)
    print(review)

if __name__ == '__main__':
    main()
