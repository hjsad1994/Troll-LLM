## 1. Remove FAQ q4 from i18n translations

- [x] 1.1 Remove `faq.q4` (question and answer) from English translations in `frontend/src/lib/i18n.ts`
- [x] 1.2 Remove `faq.q4` (question and answer) from Vietnamese translations in `frontend/src/lib/i18n.ts`

## 2. Update landing page FAQ component

- [x] 2.1 Update `faqs` array in `frontend/src/app/page.tsx` to only include q1, q2, q3 (remove q4)

## 3. Validation

- [x] 3.1 Run `npm run lint` to ensure no syntax errors
- [ ] 3.2 Test the landing page at http://localhost:8080/#faq to verify only 3 FAQ items appear
- [ ] 3.3 Test language switching between English and Vietnamese to verify both show only 3 FAQ items
