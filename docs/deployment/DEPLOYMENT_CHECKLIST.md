# Policy System Deployment Checklist

Use this checklist to track deployment progress and ensure all steps are completed.

## Pre-Deployment

- [ ] All unit tests pass (`npm test`)
- [ ] All integration tests pass (`npm run test:integration`)
- [ ] Code review completed and approved
- [ ] Environment variables verified in production
- [ ] Database backup created
- [ ] Deployment window scheduled
- [ ] Team notified of deployment
- [ ] Rollback plan reviewed

## Database Migration

- [ ] Migration script tested in staging
- [ ] Migration executed: `npm run migrate:policy-templates`
- [ ] Migration verified: `node src/scripts/verify-policy-templates.mjs`
- [ ] Cookie policy template active in database
- [ ] Privacy policy template active in database
- [ ] Template variables validated

## API Deployment

- [ ] Application built successfully: `npm run build`
- [ ] API deployed to production
- [ ] Demo policy endpoint tested: `/api/demo-policy/cookie`
- [ ] Demo policy endpoint tested: `/api/demo-policy/privacy`
- [ ] Production policy endpoint tested: `/api/policy/[site_id]/cookie`
- [ ] Production policy endpoint tested: `/api/policy/[site_id]/privacy`
- [ ] Error responses verified (404, 500)
- [ ] Cache headers verified (Cache-Control: public, max-age=300)

## Frontend Deployment

- [ ] Widget JavaScript deployed: `public/vision-privacy-widget.js`
- [ ] Floating button JavaScript deployed: `public/vision-privacy-floating-button.js`
- [ ] CSS files deployed: `public/vision-privacy-floating-button.css`
- [ ] CDN cache invalidated (if applicable)
- [ ] Widget loads on test site
- [ ] Policy modal opens correctly

## Smoke Tests - Demo Widget

- [ ] Navigate to `/demo` page
- [ ] Cookie policy link opens modal
- [ ] Privacy policy link opens modal
- [ ] Policy content displays correctly
- [ ] All template variables replaced
- [ ] Cross-policy navigation works (cookie → privacy)
- [ ] Cross-policy navigation works (privacy → cookie)
- [ ] Settings link opens cookie settings modal
- [ ] Close button works
- [ ] Escape key closes modal
- [ ] Backdrop click closes modal
- [ ] Focus returns to trigger element on close

## Smoke Tests - Production Widget

- [ ] Widget loads on registered client site
- [ ] Cookie banner displays
- [ ] "Cookie Policy" link in banner works
- [ ] Policy modal displays site-specific content
- [ ] Company name is correct
- [ ] Domain name is correct
- [ ] Detected cookies are listed
- [ ] Cookie table displays correctly
- [ ] Settings link works
- [ ] Cross-policy navigation works
- [ ] Modal is keyboard accessible
- [ ] Tab key navigates through modal elements
- [ ] Enter/Space activates links and buttons

## Mobile Testing

- [ ] Policy modal displays on mobile (< 768px)
- [ ] Modal width is 95% on mobile
- [ ] Text is readable (minimum 13px)
- [ ] Tables are scrollable
- [ ] Touch interactions work
- [ ] Close button is accessible
- [ ] Body scroll is prevented when modal open
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome

## Accessibility Testing

- [ ] Modal has `aria-hidden` attribute
- [ ] Modal has `aria-labelledby` for title
- [ ] Modal has `aria-describedby` for content
- [ ] Focus is trapped within modal
- [ ] Focus moves to first element on open
- [ ] Focus returns to trigger on close
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader announces modal correctly
- [ ] Color contrast meets WCAG AA standards

## Performance Verification

- [ ] First API request completes < 500ms
- [ ] Cached API request completes < 200ms
- [ ] Cache hit rate > 80% after warm-up
- [ ] Database query time < 100ms
- [ ] No memory leaks detected
- [ ] Modal animation is smooth (60fps)
- [ ] No layout shifts when modal opens

## Error Handling

- [ ] Invalid site_id returns 404
- [ ] Missing template returns 404
- [ ] Rendering error returns 500
- [ ] Network error shows user-friendly message
- [ ] Failed API call shows retry option
- [ ] Error messages are logged correctly

## Monitoring Setup

- [ ] Error rate alerts configured (> 5%)
- [ ] Response time alerts configured (> 1s)
- [ ] Database connection alerts configured
- [ ] Log aggregation working
- [ ] Metrics dashboard updated
- [ ] On-call rotation notified

## Post-Deployment Monitoring (First 24 Hours)

### Hour 1
- [ ] Check error logs
- [ ] Verify API response times
- [ ] Check cache hit rate
- [ ] Monitor database load

### Hour 2
- [ ] Check error logs
- [ ] Review user feedback
- [ ] Check support tickets

### Hour 4
- [ ] Check error logs
- [ ] Verify no performance degradation
- [ ] Review metrics dashboard

### Hour 8
- [ ] Check error logs
- [ ] Review daily metrics
- [ ] Check client feedback

### Hour 24
- [ ] Final error log review
- [ ] Performance summary
- [ ] Deployment report
- [ ] Mark deployment as stable

## Documentation

- [ ] API documentation updated
- [ ] Deployment guide created
- [ ] Client integration guide updated
- [ ] Internal wiki updated
- [ ] Changelog updated
- [ ] Release notes published

## Communication

- [ ] Development team notified
- [ ] Client-facing teams notified
- [ ] Clients notified of new features
- [ ] Status page updated (if applicable)
- [ ] Deployment announcement sent

## Rollback Readiness

- [ ] Previous version tagged in git
- [ ] Database rollback script prepared
- [ ] Widget backup files available
- [ ] Rollback procedure documented
- [ ] Team knows rollback process

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Tech Lead | | | |
| DevOps | | | |
| QA | | | |
| Product Owner | | | |

## Notes

_Use this section to document any issues, deviations from plan, or important observations during deployment._

---

**Deployment Date**: _______________
**Deployment Time**: _______________
**Deployed By**: _______________
**Deployment Status**: ⬜ Success ⬜ Partial ⬜ Rollback Required

---

**Post-Deployment Review Date**: _______________
**Lessons Learned**: _______________
