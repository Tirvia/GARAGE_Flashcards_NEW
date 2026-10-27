$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    const allMode = urlParams.get('all') === 'true';
    const group = urlParams.get('group');
    const cardParam = urlParams.get('card'); // VIEW MODE: конкретная карточка из поиска
    const viewMode = cardParam !== null;

    const M = window.GARAGE_MENU;
    const cardImages = window.GARAGE_cardImages;
    const sectionDisplayNames = Object.fromEntries(M.sections.map(s=>[s.id,s.name]));
    const CARD_NAMES = Object.fromEntries(M.sections.map(s=>[s.id,Object.fromEntries(M.cards.filter(c=>c.section===s.id && c.status==="published").map(c=>[c.runtimeIndex,c.title]))]));
    const GROUPS = {dinner:M.groups.find(x=>x.id==="dinner").sections,bar:M.groups.find(x=>x.id==="bar").sections};
    const ALL_SECTIONS = M.sections.filter(s=>s.status==="published").map(s=>s.id);

    let allCards = [];
    let learningCards = [];
    let currentCardIndex = 0;
    let showNames = false;
    let currentTitle = '';
    let swiping = false;

    let isDragging = false;
    let startX = 0;
    let currentX = 0;

    const $section      = $('.section');
    const $flashcard    = $('.flashcard');
    const $frontImg     = $('#frontImg');
    const $backImg      = $('#backImg');
    const $questionBtn  = $('#question, #question-mobile');
    const $flipBtn      = $('#flipCard, #flipCard-mobile');
    const $rememberBtn  = $('#rememberBtn');
    const $forgetBtn    = $('#forgetBtn');
    const $progressInfo = $('#progressInfo');
    const $sectionTitle = $('#sectionTitle');
    const $helpBtn      = $('#helpBtn');
    const $cardName     = $('#cardName');
    const $modeToggle   = $('#modeToggle');
    const $viewModeBar  = $('#viewModeBar');
    const $restartBtn   = $('#restartBtn');

    // ========== VIEW MODE ==========
    if (viewMode) {
        $section.addClass('view-mode');
        $viewModeBar.show();
    }

    // ========== MODE TOGGLE ==========
    $modeToggle.on('click', function() {
        showNames = !showNames;
        if (showNames) {
            $(this).addClass('active');
            $(this).find('.mode-label').text('С названием');
        } else {
            $(this).removeClass('active');
            $(this).find('.mode-label').text('Без названия');
        }
        updateCardName();
    });

    function getCurrentCardName() {
        if (!learningCards.length) return '';
        const card = learningCards[currentCardIndex];
        if (!card) return '';
        const sectionNames = CARD_NAMES[card.sectionName];
        if (!sectionNames) return '';
        return sectionNames[card.imgIndex] || '';
    }

    function updateCardName() {
        // В режиме просмотра — название всегда показывается (управляется через CSS .view-mode)
        // В режиме обучения — только когда showNames = true
        if (viewMode) {
            const name = getCurrentCardName();
            $cardName.text(name || '').css('display', name ? 'block' : 'none');
        } else if (showNames && learningCards.length) {
            const name = getCurrentCardName();
            $cardName.text(name || '').css('display', name ? 'block' : 'none');
        } else {
            $cardName.hide();
        }
    }

    // ========== COMPLETION SCREEN ==========
    function showCompletionScreen() {
        $section.addClass('completion-state');
        $sectionTitle.text('🎉 Все карточки выучены!');
    }

    function hideCompletionScreen() {
        $section.removeClass('completion-state');
        $sectionTitle.text(currentTitle);
    }

    $restartBtn.on('click', function() {
        hideCompletionScreen();
        initLearning();
        $flashcard.show();
        showCurrentCard();
    });

    // ========== MODAL ==========
    if (!$('.modal').length) {
        const modalHtml = `
            <div class="modal" id="instructionModal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h3>Как учить карточки</h3>
                    <ul>
                        <li><strong>Свайпай карточку:</strong><br>
                        👉 вправо — если запомнил (она исчезнет)<br>
                        👈 влево — если не запомнил (появится снова позже)</li>
                        <li><strong>Нажми на карточку</strong> или кнопку «Посмотреть состав», чтобы перевернуть её.</li>
                        <li><strong>Кнопка «Загадать блюдо»</strong> показывает случайную карточку (прогресс не меняется).</li>
                        <li><strong>Переключатель названия</strong> показывает или скрывает название блюда поверх карточки.</li>
                        <li><strong>Вверху отображается</strong>, сколько карточек осталось выучить.</li>
                    </ul>
                </div>
            </div>
        `;
        $('body').append(modalHtml);
    }

    const $modal = $('#instructionModal');
    const $closeModal = $('.close-modal');
    $helpBtn.on('click', () => $modal.css('display', 'flex'));
    $closeModal.on('click', () => $modal.hide());
    $(window).on('click', (e) => { if (e.target === $modal[0]) $modal.hide(); });

    // ========== LOAD CARDS ==========
    function checkImagePair(basePath, sectionName, index) {
        return new Promise(resolve => {
            const img = new Image();
            img.src = `${basePath}${index}.png`;
            img.onload = () => resolve({
                question: `${basePath}${index}.png`,
                answer: `${basePath}${index + 1}.png`,
                sectionName: sectionName,
                imgIndex: index
            });
            img.onerror = () => resolve(null);
        });
    }

    async function loadCardsFromSection(sectionName) {
        const basePath = `../images/${sectionName}/`;
        // Keep the original order; generate and decode each answer only on demand.
        return M.cards.filter(c=>c.section===sectionName && c.status==="published")
            .map(c=>({question:c.front,source:c,sectionName, imgIndex:c.runtimeIndex,id:c.id}));
    }

    async function loadCardsFromSections(sectionsList, title) {
        currentTitle = title;
        $sectionTitle.text(`Загрузка ${title}...`);
        $flashcard.hide();
        setButtonsDisabled(true);

        const promises = sectionsList.map(loadCardsFromSection);
        const results = await Promise.all(promises);
        allCards = results.flat();

        if (!allCards.length) {
            $sectionTitle.text(`Не найдено карточек для ${title}`);
            return;
        }

        $sectionTitle.text(title);
        setButtonsDisabled(false);
        initLearning();
        $flashcard.show();
        showCurrentCard();
    }

    async function loadCardsForSection(sectionName) {
        const displayName = sectionDisplayNames[sectionName] || sectionName;
        currentTitle = `Изучаем: ${displayName}`;
        $sectionTitle.text(`Загрузка раздела "${displayName}"...`);
        $flashcard.hide();
        setButtonsDisabled(true);

        allCards = await loadCardsFromSection(sectionName);

        if (!allCards.length) {
            $sectionTitle.text(`Раздел "${displayName}" не содержит карточек`);
            return;
        }

        $sectionTitle.text(currentTitle);
        setButtonsDisabled(false);
        initLearning();
        $flashcard.show();
        showCurrentCard();
    }

    // ========== VIEW MODE: загрузка одной карточки ==========
    async function loadSingleCard(sectionName, cardIdx) {
        const displayName = sectionDisplayNames[sectionName] || sectionName;
        const cardName = M.cards.find(c=>c.legacySection===sectionName && c.legacyIndex===parseInt(cardIdx))?.title || M.cards.find(c=>c.section===sectionName && c.runtimeIndex===parseInt(cardIdx))?.title || '';
        const title = cardName || displayName;

        $sectionTitle.text(cardName ? cardName : `Загрузка...`);
        $flashcard.hide();

        const basePath = `../images/${sectionName}/`;
        const idx = parseInt(cardIdx);

        // Проверяем наличие изображений
        const sourceCard=M.cards.find(c=>c.legacySection===sectionName && c.legacyIndex===idx && c.status==="published") || M.cards.find(c=>c.section===sectionName && c.runtimeIndex===idx && c.status==="published");
        const card=sourceCard?{question:sourceCard.front,source:sourceCard,sectionName:sourceCard.section,imgIndex:sourceCard.runtimeIndex,id:sourceCard.id}:null;

        if (!card) {
            $sectionTitle.text(`Карточка не найдена`);
            return;
        }

        allCards = [card];
        learningCards = [card];
        currentCardIndex = 0;

        $sectionTitle.text(title);
        $flashcard.show();

        // Both sides become visible only after the new images have decoded.
        showCurrentCard();
    }

    function setButtonsDisabled(disabled) {
        $questionBtn.prop('disabled', disabled);
        $flipBtn.prop('disabled', disabled);
        $rememberBtn.prop('disabled', disabled);
        $forgetBtn.prop('disabled', disabled);
    }

    function initLearning() {
        learningCards = [...allCards];
        shuffleArray(learningCards);
        currentCardIndex = 0;
        updateProgressInfo();
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function updateProgressInfo() {
        $progressInfo.text(`Осталось: ${learningCards.length} / ${allCards.length}`);
    }

    function showCurrentCard() {
        if (!learningCards.length) {
            $flashcard.hide();
            showCompletionScreen();
            return;
        }

        const card = learningCards[currentCardIndex];

        // Убедимся, что карточка всегда показывается со стороны ВОПРОСА
        // (сброс без анимации, если нужно)
        if ($flashcard.hasClass('flipped')) {
            const $inner = $flashcard.find('.flashcard-inner');
            $inner.css('transition', 'none');
            $flashcard.removeClass('flipped');
            $flashcard[0].offsetHeight; // принудительный reflow
            $inner.css('transition', '');
        }

        $flipBtn.text('Посмотреть состав');
        $('#flipCard-mobile').text('Посмотреть состав');
        cardImages.showPair($frontImg[0], $backImg[0], card.question,
            card.source ? cardImages.answer(card.source) : card.answer)
            .then(() => {
                // Preload the next few cards instead of waiting for the next click.
                if (learningCards[currentCardIndex] === card) {
                    cardImages.prefetchNearby(learningCards, currentCardIndex + 1, 5);
                }
            });
        updateCardName();
    }

    function showRandomCard() {
        if (!learningCards.length || swiping) return;
        let newIndex = Math.floor(Math.random() * learningCards.length);
        if (newIndex === currentCardIndex && learningCards.length > 1)
            newIndex = (newIndex + 1) % learningCards.length;
        currentCardIndex = newIndex;
        showCurrentCard();
    }

    // ========== ACTIONS ==========
    function markKnown() {
        if (!learningCards.length || swiping) return;
        learningCards.splice(currentCardIndex, 1);
        updateProgressInfo();
        if (!learningCards.length) { showCurrentCard(); return; }
        if (currentCardIndex >= learningCards.length) currentCardIndex = 0;
        animateSwipe('right');
    }

    function markUnknown() {
        if (!learningCards.length || swiping) return;
        const card = learningCards.splice(currentCardIndex, 1)[0];
        learningCards.push(card);
        updateProgressInfo();
        if (currentCardIndex >= learningCards.length) currentCardIndex = 0;
        animateSwipe('left');
    }

    function animateSwipe(direction) {
        swiping = true;
        // The 350ms outgoing swipe is time available to fetch the next image.
        cardImages.prefetchNearby(learningCards, currentCardIndex, 6);
        // FIX: Мгновенно переворачиваем карточку на сторону вопроса (без анимации переворота),
        // чтобы следующая карточка всегда вылетала со стороны вопроса.
        const $inner = $flashcard.find('.flashcard-inner');
        if ($flashcard.hasClass('flipped')) {
            $inner.css('transition', 'none');
            $flashcard.removeClass('flipped');
            $flashcard[0].offsetHeight; // принудительный reflow
            $inner.css('transition', '');
        }

        $flipBtn.text('Посмотреть состав');
        $('#flipCard-mobile').text('Посмотреть состав');

        const className = direction === 'right' ? 'swipe-right' : 'swipe-left';
        $flashcard.addClass(className);
        setTimeout(() => {
            $flashcard.removeClass(className);
            $flashcard.removeClass('like dislike');
            swiping = false;
            showCurrentCard();
        }, 350);
    }

    // ========== SWIPE ==========
    $flashcard.on('mousedown touchstart', function(e) {
        if (!learningCards.length || viewMode) return;
        isDragging = true;
        startX = e.pageX || e.originalEvent.touches[0].pageX;
        currentX = startX;
        $flashcard.addClass('dragging');
    });

    $(document).on('mousemove touchmove', function(e) {
        if (!isDragging) return;
        currentX = e.pageX || e.originalEvent.touches[0].pageX;
        let diff = currentX - startX;
        $flashcard.css('transform', `translateX(${diff}px) rotate(${diff * 0.05}deg)`);
        if (diff > 30) {
            $flashcard.addClass('like').removeClass('dislike');
        } else if (diff < -30) {
            $flashcard.addClass('dislike').removeClass('like');
        } else {
            $flashcard.removeClass('like dislike');
        }
    });

    $(document).on('mouseup touchend', function() {
        if (!isDragging) return;
        isDragging = false;
        $flashcard.removeClass('dragging');
        let diff = currentX - startX;
        $flashcard.css('transform', '');
        $flashcard.removeClass('like dislike');
        if (Math.abs(diff) > 60) {
            diff > 0 ? markKnown() : markUnknown();
        }
    });

    // ========== BUTTONS ==========
    $questionBtn.on('click', showRandomCard);

    $flipBtn.on('click', function() {
        if ($flashcard.is(':visible')) {
            $flashcard.toggleClass('flipped');
            const text = $flashcard.hasClass('flipped') ? 'Посмотреть фото' : 'Посмотреть состав';
            $flipBtn.text(text);
            $('#flipCard-mobile').text(text);
        }
    });

    $flashcard.on('click', function() {
        if ($flashcard.is(':visible') && !isDragging) {
            $flashcard.toggleClass('flipped');
            const text = $flashcard.hasClass('flipped') ? 'Посмотреть фото' : 'Посмотреть состав';
            $flipBtn.text(text);
            $('#flipCard-mobile').text(text);
        }
    });

    $rememberBtn.on('click', markKnown);
    $forgetBtn.on('click', markUnknown);

    // ========== INIT ==========
    if (viewMode && section) {
        // РЕЖИМ ПРОСМОТРА: одна конкретная карточка из поиска
        loadSingleCard(section, cardParam);
    } else if (allMode) {
        loadCardsFromSections(ALL_SECTIONS, 'Все разделы меню');
    } else if (group && GROUPS[group]) {
        let title = group === 'dinner' ? 'Ужин (все блюда)' : 'Бар (все напитки)';
        loadCardsFromSections(GROUPS[group], title);
    } else if (section) {
        loadCardsForSection(section);
    } else {
        $sectionTitle.text('Выберите раздел в меню');
        $flashcard.hide();
        setButtonsDisabled(true);
    }
});
