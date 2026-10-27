$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    const allMode = urlParams.get('all') === 'true';
    const group = urlParams.get('group');
    const cardParam = urlParams.get('card'); // VIEW MODE: конкретная карточка из поиска
    const viewMode = cardParam !== null;

    const sectionDisplayNames = {
        'zavtrak': 'Завтраки',
        'Detskoe': 'Детское меню',
        'Salaty': 'Салаты',
        'Zacuski': 'Закуски',
        'Supy': 'Супы',
        'Gor_bluda': 'Горячие блюда',
        'Draniki': 'Драники',
        'Pasta': 'Паста',
        'Burgery_tostada': 'Бургеры и тостада',
        'Pizza': 'Пицца',
        'Deserty': 'Десерты',
        '103BY': 'Меню состояний',
        'Sogr_napitki': 'Согревающие напитки',
        'Firm_kofe': 'Фирменный кофе',
        'Kakao_kofe_matcha': 'Какао, кофе, матча',
        'Chaj': 'Чай',
        'Bezalco': 'Безалкогольные коктейли',
        'alco': 'Алкогольные коктейли',
        'Alco_1 1': 'Коктейли 1+1',
   
        'sezonnoe': 'Сезонное'
    };

    // Card names: section -> imageIndex -> name
    const CARD_NAMES = {
        'zavtrak': {
            1: 'Бульон с куриным филе',
            3: 'Гречотто с трюфельными шампиньонами',
            5: 'Овсянка с беконом',
            7: 'Овсянка с цукатами из киви',
            9: 'Омлет с салатом',
            11: 'Омлет с салатом и курицей',
            13: 'Омлет с салатом и беконом',
            15: 'Омлет с салатом и лососем',
            17: 'Сырники с творожно-манговым кремом',
            19: 'Блинчики с творогом и пюре манго',
            21: 'Скрэмбл с беконом и салатом',
            23: 'Английский завтрак',
            25: 'Белорусский завтрак',
            27: 'Американский завтрак',
            29: 'Сэндвич с говядиной'
        },
        'Detskoe': {
            1: 'Бейбичино Персик',
            3: 'Бейбичино Соленая карамель',
            5: 'Коктейль молочный Обжора',
            7: 'Сырники с творожно-манговым кремом',
            9: 'Нарисуй свой сырник',
            11: 'Бульон с куриным филе',
            13: 'Бургер с куриным бедром',
            15: 'Пицца с сосисками и томатами',
            17: 'Куриный биточек с картофельным пюре и овощами',
            19: 'Пицца с ветчиной, курицей и ананасами',
            21: 'Сосиски с картофельным пюре',
            23: 'Лингвини с сыром',
            25: 'Лингвини с ветчиной и курицей',
            27: 'Картофель фри с наггетсами'
        },
        'Salaty': {
            1: 'Греческий салат с рулетиками из цукини',
            3: 'Цезарь с креветками',
            5: 'Цезарь с курицей',
            7: 'Цезарь с беконом и яйцом',
            9: 'Теплый салат с ростбифом и сливочным сыром',
            11: 'Зеленый салат с соусом Ростбиф',
            13: 'Оливье с копченой курицей'
        },
          
        'Zacuski': {
            1: 'Тартар из говядины',
            3: 'Карпаччо из говядины',
            5: 'Севиче из лосося с дальневосточным гребешком',
            7: 'Сельдь с печеным картофелем и малиновым луком',
            9: 'Риет из судака',
            11: 'Мясное плато',
            13: 'Картофель фри с наггетсами',
            15: 'Запеченный Чеддер',
            17: 'Пивной набор',
            19: 'Жареные креветки с тайским айоли',
            21: 'Крылышки в глазури Унаги и Свит Чили с кунжутом',
            23: 'Мясная доска на компанию',
            25: 'Гренки с балтийским соусом'
        },
        'Supy': {
            1: 'Солянка GARAGE',
            3: 'Грибной крем-суп с трюфельной пастой',
            5: 'Борщ с говяжьими щечками',
            7: 'Том ям с морепродуктами',
            9: 'Суп куриный',
            11: 'Холодник на кефире с картофельными дольками'
        },
        'Gor_bluda': {
            1: 'Куриные биточки с картофельным пюре и грибным соусом',
            3: 'Шницель из курицы с картофельными дольками и зеленым салатом',
            5: 'Картофельная запеканка с говяжьими щечками в сливочном демигласе',
            7: 'Рыбная котлета с пюре, икрой и соусом сливочный тайгермилк',
            9: 'Рулька с картофелем и яйцом',
            11: 'Ребрышки с мятым картофелем, соусом из хрена и опятами',
            13: 'Рис в азиатском стиле с говядиной',
            15: 'Рис в азиатском стиле с курицей',
            17: 'Запеченная свинина в сливочном соусе',
            19: 'Стейк из говядины с трюфельным пюре и огурцами кимчи',
            21: 'Стейк из лосося с печеными овощами',
            23: 'Утиное филе с пюре из корня сельдерея с ягодным конфи',
            25: 'Вырезка из говядины с картофельными дольками и овощами',
            27: 'Говяжьи щечки с трюфельным пюре'
        },
        'Draniki': {
            1: 'Драники с куриным бедром и грибным соусом',
            3: 'Драники с рулькой и яйцом',
            5: 'Драники с беконом и сметаной',
            7: 'Драники с лососем и зеленым соусом',
            9: 'Драники с риетом из копченого судака'
        },
        'Pasta': {
            1: 'Паста с цыпленком, грибами и трюфельным соусом',
            3: 'Паста с беконом и сливочным соусом',
            5: 'Паста с креветками, брокколи и сыром дорблю',
            7: 'Паста с говядиной в азиатском стиле'
        },
        'Burgery_tostada': {
            1: 'Тостада с говядиной',
            3: 'Тостада с курицей',
            5: 'Бургер с говядиной, огурцами кимчи и малиновой горчицей',
            7: 'Бургер с курицей, беконом и соусом Тартар'
        },
        'Pizza': {
            1: 'Ветчина и грибы',
            3: 'Баварская',
            5: 'Гавайская с ананасами кимчи',
            7: 'Пепперони',
            9: 'Маргарита',
            11: 'Барбекю',
            13: 'Шеф-пицца',
            15: 'Цезарь',
            17: 'С говяжьими щечками',
            19: 'Бонанза',
            21: 'Вегетарианская',
            23: 'Грибная с трюфельным медом',
            25: 'GARAGE',
            27: 'Чизбургер',
            29: '5 сыров с трюфельным медом',
            31: 'С креветкой и стружкой тунца',
            33: '5 сыров с пепперони'
        },
        'Deserty': {
            1: 'Фондан со сметанным соусом',
            3: 'Сырники с творожно-манговым кремом',
            5: 'Баблс с ананасом',
            7: 'Баблс с бананом',
            9: 'Наполеон',
            11: 'Торт Медовик'
        },
        '103BY': {
            1: 'Поке с креветкой',
            3: 'Салат с маринованной свеклой',
            5: 'Омлет с индейкой и салатом из свежих овощей',
            7: 'Омлет с креветками и салатом из свежих овощей',
            9: 'Йогурт с чиа и пюре манго',
            11: 'Салат с ростбифом и картофельными дольками',
            13: 'Куриные биточки с гречкой и салатом',
            15: 'Киноа-боул с креветкой',
            17: 'Поке с лососем',
            19: 'Салат с курицей и соусом Дзадзики',
            21: 'Киноа-боул с ростбифом',
            23: 'Матча-смузи со шпинатом и бананом',
            25: 'Соба с креветками',
            27: 'Тостада с креветками и картофельными дольками',
            29: 'Протеиновый коктейль Кофейно-миндальный',
            31: 'Протеиновый коктейль Смородина-Ваниль',
            33: 'Протеиновый коктейль Матча-Фисташка'       
        },
        'Sogr_napitki': {
            1: 'Горячий бамбл',
            3: 'Чай ягодный цитрус',
            5: 'Апельсиновый тодди',
            7: 'Какао малина-ваниль',
            9: 'Раф апельсиновый пирог',
            11: 'Глинтвейн безалкогольный',
            13: 'Глинтвейн алкогольный'
        },
        'Firm_kofe': {
            1: 'Бамбл кофе',
            5: 'Эспрессо-тоник',
            7: 'Латте орео',
            9: 'Айс латте'
        },
        'Kakao_kofe_matcha': {
            1: 'Эспрессо',
            3: 'Американо',
            5: 'Капучино',
            7: 'Латте',
            9: 'Раф',
            11: 'Мокко',
            13: 'Матча-капучино',
            15: 'Какао классическое',
            17: 'Флэт Уайт',
            19: 'Халвичный раф',
           
            23: 'Матча Тоник'
        },
        'Chaj': {
            1: 'Малиновый чай',
            3: 'Чай Горячий цитрус',
            5: 'Имбирный чай',
            7: 'Чай Лесной с сосновыми шишками',
            9: 'Облепиховый чай',
            11: 'Чай Имбирь-юдзу'
        },
        'Bezalco': {
           
            3: 'Bubble Tea Вишня',
            5: 'Bubble Tea Клубничный милкшейк',
            7: 'Bubble Tea Малина-анчан',
            11: 'Малиновый милкшейк',
            13: 'Милкшейк Сникерс',
            15: 'Милкшейк Орео',
            17: 'Мохито классический',
            19: 'Мохито Ягодный',
            21: 'Мохито Маракуйя',
            23: 'Лимонад Маракуйя-малина',
            
            27: 'Пина Колада NO ALCO'
        },
        'alco': {
            1: 'Френч кофе (со льдом / теплый)',
            3: 'Белый русский',
            9: 'Космо 2.0',
            11: 'Сприц мейджик',
            13: 'Бетон',
            15: 'Мартини тоник',
            17: 'Фиеро тоник',
            19: 'Джин тоник',
            21: 'Виски William Lawson\'s кола',
            23: 'Мохито алко',
            25: 'Куба Либре',
            27: 'Тропикал Май Тай',
            29: 'Лонг Айленд Айс Ти',
            31: 'Пина Колада ALCO'
        },
        'Alco_1 1': {
            1: 'Анчи',
            3: 'ДжинГрейн',
            5: 'Малиновый Джин Физ',
            7: 'Ягодный Стронг Лонг',
            9: 'Карибский трип',
            11: 'Элбоу',
            13: 'Лимонный шот',
            15: 'Сливочно-мятный шот',
            17: 'Ягодно-цитрусовый шот'
        },
     'sezonnoe': {
    1: 'Сбитень БА',
    3: 'Чай Карамельное яблоко',
    5: 'Пельмени с тунцом и креветкой',
    7: 'Свиная грудинка с пюре и домашней аджикой',
    9: 'Крем-суп из батата с кокосовым молоком',
    11: 'Тартар из тунца',
    13: 'Нисуаз с тунцом'
}
    };

    const GROUPS = {
        dinner: ['Salaty', 'Zacuski', 'Supy', 'Gor_bluda', 'Draniki', 'Pasta', 'Burgery_tostada', 'Pizza', 'Deserty'],
        bar: ['Sogr_napitki', 'Firm_kofe', 'Kakao_kofe_matcha', 'Chaj', 'Bezalco', 'alco', 'Alco_1 1']
    };

    const ALL_SECTIONS = [
        'zavtrak', 'Detskoe', 'Salaty', 'Zacuski', 'Supy', 'Gor_bluda',
        'Draniki', 'Pasta', 'Burgery_tostada', 'Pizza', 'Deserty', '103BY',
        'Sogr_napitki', 'Firm_kofe', 'Kakao_kofe_matcha', 'Chaj', 'Bezalco',
        'alco', 'Alco_1 1',  'sezonnoe'
    ];

    let allCards = [];
    let learningCards = [];
    let currentCardIndex = 0;
    let showNames = false;
    let currentTitle = '';

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
        const MAX = 100;
        const checks = [];
        for (let i = 1; i <= MAX; i += 2) checks.push(checkImagePair(basePath, sectionName, i));
        const results = await Promise.all(checks);
        return results.filter(Boolean);
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
        const cardName = (CARD_NAMES[sectionName] || {})[parseInt(cardIdx)] || '';
        const title = cardName || displayName;

        $sectionTitle.text(cardName ? cardName : `Загрузка...`);
        $flashcard.hide();

        const basePath = `../images/${sectionName}/`;
        const idx = parseInt(cardIdx);

        // Проверяем наличие изображений
        const card = await checkImagePair(basePath, sectionName, idx);

        if (!card) {
            $sectionTitle.text(`Карточка не найдена`);
            return;
        }

        allCards = [card];
        learningCards = [card];
        currentCardIndex = 0;

        $sectionTitle.text(title);
        $flashcard.show();

        // Показываем карточку
        $frontImg.attr('src', card.question);
        $backImg.attr('src', card.answer);
        updateCardName();
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
        $frontImg.attr('src', card.question);
        $backImg.attr('src', card.answer);
        updateCardName();
    }

    function showRandomCard() {
        if (!learningCards.length) return;
        let newIndex = Math.floor(Math.random() * learningCards.length);
        if (newIndex === currentCardIndex && learningCards.length > 1)
            newIndex = (newIndex + 1) % learningCards.length;
        currentCardIndex = newIndex;
        showCurrentCard();
    }

    // ========== ACTIONS ==========
    function markKnown() {
        if (!learningCards.length) return;
        learningCards.splice(currentCardIndex, 1);
        updateProgressInfo();
        if (!learningCards.length) { showCurrentCard(); return; }
        if (currentCardIndex >= learningCards.length) currentCardIndex = 0;
        animateSwipe('right');
    }

    function markUnknown() {
        if (!learningCards.length) return;
        const card = learningCards.splice(currentCardIndex, 1)[0];
        learningCards.push(card);
        updateProgressInfo();
        if (currentCardIndex >= learningCards.length) currentCardIndex = 0;
        animateSwipe('left');
    }

    function animateSwipe(direction) {
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
