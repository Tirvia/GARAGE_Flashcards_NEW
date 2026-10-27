/* GARAGE card image pipeline: pre-decode the next pictures, hide outgoing
   pixels immediately, and apply only the most recent navigation request. */
(function () {
    'use strict';

    const images = new Map();
    const answers = new WeakMap();
    const versions = new WeakMap();
    const CACHE_LIMIT = 56;

    function preload(src) {
        if (!src) return Promise.resolve(false);
        const cached = images.get(src);
        if (cached) {
            images.delete(src);
            images.set(src, cached);
            return cached.promise;
        }

        const image = new Image();
        image.decoding = 'async';
        let resolveImage;
        const promise = new Promise(resolve => { resolveImage = resolve; });
        const entry = { image, promise };
        images.set(src, entry);

        let settled = false;
        function finish(ok) {
            if (settled) return;
            settled = true;
            image.onload = null;
            image.onerror = null;
            if (!ok && images.get(src) === entry) images.delete(src);
            resolveImage(Boolean(ok));
        }

        image.onload = () => {
            // A decoded image is ready to paint before it replaces the old card.
            if (typeof image.decode === 'function') {
                image.decode().then(() => finish(true), () => finish(image.naturalWidth > 0));
            } else {
                finish(image.naturalWidth > 0);
            }
        };
        image.onerror = () => finish(false);
        image.src = src;
        if (image.complete && image.naturalWidth > 0) {
            if (typeof image.decode === 'function') {
                image.decode().then(() => finish(true), () => finish(true));
            } else {
                finish(true);
            }
        }

        while (images.size > CACHE_LIMIT) {
            images.delete(images.keys().next().value);
        }
        return promise;
    }

    function answer(card) {
        if (!card) return '';
        if (!answers.has(card)) answers.set(card, window.GARAGE_answerSrc(card));
        return answers.get(card);
    }

    function prefetch(pair) {
        if (!pair) return;
        preload(pair.front || pair.question);
        preload(pair.back || pair.answer);
    }

    function prefetchNearby(cards, start, count) {
        if (!cards.length) return;
        const seen = new Set();
        const max = Math.min(count || 5, cards.length);
        for (let step = 0; step < max; step++) {
            const card = cards[(start + step) % cards.length];
            if (!card || seen.has(card.id)) continue;
            seen.add(card.id);
            const front = card.front || card.question;
            const back = card.backReady || (card.source ? answer(card.source) : card.answer);
            prefetch({ front, back });
        }
    }

    function showPair(frontElement, backElement, frontSrc, backSrc) {
        const version = (versions.get(frontElement) || 0) + 1;
        versions.set(frontElement, version);

        // Do this before any await: an older photo must never remain visible
        // while its replacement is loading or the user switches again.
        frontElement.style.visibility = 'hidden';
        backElement.style.visibility = 'hidden';

        // Paint the front as soon as it is decoded; a slower answer-side image
        // must not delay the photo that the learner is actually looking at.
        function display(element, src, ready) {
            if (versions.get(frontElement) !== version) return false;
            if (ready) {
                element.src = src;
                element.style.visibility = 'visible';
            } else {
                element.removeAttribute('src');
            }
            return ready;
        }
        const frontReady = preload(frontSrc).then(ok => display(frontElement, frontSrc, ok));
        const backReady = preload(backSrc).then(ok => display(backElement, backSrc, ok));
        return Promise.all([frontReady, backReady]).then(([a, b]) => a && b);
    }

    window.GARAGE_cardImages = { preload, answer, prefetch, prefetchNearby, showPair };
})();
