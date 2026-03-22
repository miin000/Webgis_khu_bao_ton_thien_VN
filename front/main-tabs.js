/**
 * main-tabs.js - Main page tabs for Home / Map / CRUD / Logs.
 */

(function () {
    function setActiveMainTab(targetId) {
        var buttons = document.querySelectorAll('.main-tab-btn');
        var pages = document.querySelectorAll('.main-page');

        buttons.forEach(function (btn) {
            btn.classList.toggle('is-active', btn.dataset.mainTarget === targetId);
        });

        pages.forEach(function (page) {
            var active = page.id === targetId;
            page.hidden = !active;
            page.classList.toggle('is-active', active);
        });

        if (typeof GIS !== 'undefined' && typeof GIS.onMainTabChanged === 'function') {
            GIS.onMainTabChanged(targetId);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        var buttons = document.querySelectorAll('.main-tab-btn');

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                setActiveMainTab(btn.dataset.mainTarget);
            });
        });

        // Default to Home tab.
        setActiveMainTab('pageHome');
    });
})();
