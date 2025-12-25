/**
 * Quick Links Client Extension
 * Entry point for dynamic behavior
 */

function initQuickLinks() {
    console.log('Quick Links Client Extension initialized');

    // Example: Add click handlers if needed beyond standard links
    const cards = document.querySelectorAll('.quick-link-card');

    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Allow default link behavior, but we could track analytics here
            console.log('Clicked:', card.querySelector('.link-text').textContent.trim());

            // Optional: Toggle active class for demo purposes if not navigating
            // document.querySelectorAll('.quick-link-card').forEach(c => c.classList.remove('active'));
            // card.classList.add('active');
        });
    });
}

// Initialize when DOM is ready or when Liferay fragment loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickLinks);
} else {
    initQuickLinks();
}
