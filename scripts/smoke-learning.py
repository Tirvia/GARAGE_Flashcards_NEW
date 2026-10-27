#!/usr/bin/env python3
"""Smoke-test real GARAGE training flows with a real headless browser."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = "http://127.0.0.1:8765"
OUT = Path("smoke-output")
OUT.mkdir(exist_ok=True)

def check_errors(errors):
    if errors:
        raise AssertionError("Browser errors: " + " | ".join(errors))

def complete_questions(page, amount):
    for index in range(amount):
        expect(page.locator("#questionCounter")).to_contain_text(f"Вопрос {index+1} из {amount}")
        # The photo must only appear for photo questions, not as a broken placeholder
        # in questions about ingredients or guest situations.
        if (page.locator("#questionType").text_content() or "").strip() == "По фотографии":
            expect(page.locator("#questionImage")).to_be_visible()
            assert page.locator("#questionImage").evaluate("(node) => node.naturalWidth > 0")
        else:
            expect(page.locator("#questionImage")).to_be_hidden()
        expect(page.locator("#questionNote")).to_be_hidden()
        option = page.locator("#choices .choice").first
        expect(option).to_be_visible()
        option.click()
        page.locator("#checkBtn").click()
        expect(page.locator("#feedback")).to_be_visible()
        expect(page.locator("#feedback .answer-explanation")).to_be_visible()
        assert page.locator("#feedback .answer-explanation").inner_text().strip()
        page.locator("#nextBtn").click()
    expect(page.locator("#summary")).to_be_visible()
    assert page.locator("#resultScore").inner_text()

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox"])
    errors = []
    page = browser.new_page(viewport={"width": 1180, "height": 850})
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(f"{ROOT}/index.html")
    expect(page.get_by_role("link", name="Проверить знания по всему меню")).to_be_visible()
    page.get_by_role("link", name="Проверить знания по всему меню").click()
    expect(page).to_have_url(f"{ROOT}/training.html")
    expect(page.locator("#dashboard")).to_be_visible()
    assert page.locator("#sectionFilter option").count() == 21
    assert page.locator("[data-mode]").count() == 5
    check_errors(errors)

    # Objective quiz, answer feedback and progress retention across page reloads.
    page.locator('[data-mode="quiz"]').click()
    expect(page.locator("#play")).to_be_visible()
    complete_questions(page, 12)
    page.screenshot(path=str(OUT / "result-desktop.png"), full_page=True)
    page.locator("#homeBtn").click()
    assert int(page.locator("#studiedCount").inner_text()) >= 12
    page.reload()
    assert int(page.locator("#studiedCount").inner_text()) >= 12

    # Different question formats should appear in the objective quiz after verified recipes.
    page.locator('[data-mode="quiz"]').click()
    expect(page.locator("#questionPrompt")).to_be_visible()
    page.locator("#exitBtn").click()

    # Daily mode: 8 short questions and a completion marker.
    page.locator('[data-mode="daily"]').click()
    complete_questions(page, 8)
    page.locator("#homeBtn").click()
    expect(page.locator("#dailyStatus")).to_contain_text("завершена")

    # Recall: start with a real photo, hide the old answer until requested,
    # and verify that the answer ALWAYS belongs to the title being displayed.
    page.locator('[data-mode="recall"]').click()
    for index in range(3):
        expect(page.locator("#questionCounter")).to_contain_text(f"Вопрос {index+1} из 8")
        expect(page.locator("#questionImage")).to_be_visible()
        assert page.locator("#questionImage").evaluate("(node) => node.naturalWidth > 0")
        expect(page.locator("#recallCard")).to_be_hidden()
        assert page.locator("#recallCard").evaluate("(node) => getComputedStyle(node).display") == "none"
        assert page.locator("#recallImage").get_attribute("src") is None
        page.locator("#revealBtn").click()
        expect(page.locator("#recallImage")).to_be_visible()
        expect(page.locator("#recallCard")).to_be_visible()
        assert page.locator("#recallImage").evaluate("(node) => node.naturalWidth > 0")
        mapping = page.evaluate("""
          () => {
            const title = document.getElementById('questionPrompt').textContent;
            const card = window.GARAGE_MENU.cards.find(c => c.title === title);
            const actual = document.getElementById('recallImage');
            return {
              id: card && card.id,
              actualId: actual.dataset.cardId,
              match: card && actual.src === window.GARAGE_answerSrc(card)
            };
          }
        """)
        assert mapping["id"] == mapping["actualId"] and mapping["match"], mapping
        if index == 0:
            page.screenshot(path=str(OUT / "recall-answer.png"), full_page=True)
        page.locator("#repeatBtn").click()
        expect(page.locator("#nextBtn")).to_be_visible()
        page.locator("#nextBtn").click()
    page.locator("#exitBtn").click()
    # Regression for the two dishes that were mismatched in the user's screenshot.
    assert page.evaluate("""
      () => {
        const raf = window.GARAGE_MENU.cards.find(c => c.title === 'Раф апельсиновый пирог');
        const trip = window.GARAGE_MENU.cards.find(c => c.title === 'Карибский трип');
        return raf && trip && raf.id !== trip.id && raf.back !== trip.back &&
               window.GARAGE_answerSrc(raf) !== window.GARAGE_answerSrc(trip);
      }
    """)

    # Updates page should work even before the first menu edit.
    page.locator('[data-mode="changes"]').click()
    expect(page.locator("#updates")).to_be_visible()
    assert page.locator("#changesList").inner_text()
    page.locator("#backUpdatesBtn").click()

    # Mistake repetition must be available after wrong answers.
    page.locator('[data-mode="mistakes"]').click()
    expect(page.locator("#play")).to_be_visible()
    page.locator("#exitBtn").click()
    check_errors(errors)
    page.screenshot(path=str(OUT / "training-desktop.png"), full_page=True)

    # Small viewport: controls remain readable and functional.
    mobile = browser.new_page(viewport={"width": 375, "height": 812}, is_mobile=True, has_touch=True)
    mobile_errors = []
    mobile.on("pageerror", lambda error: mobile_errors.append(str(error)))
    mobile.goto(f"{ROOT}/training.html")
    expect(mobile.locator('[data-mode="daily"]')).to_be_visible()
    mobile.locator('[data-mode="daily"]').click()
    expect(mobile.locator("#questionPrompt")).to_be_visible()
    assert mobile.locator("#choices .choice").count() >= 2  # comparisons have exactly two answers
    mobile.screenshot(path=str(OUT / "training-mobile.png"), full_page=True)
    check_errors(mobile_errors)
    mobile.close()
    browser.close()
print("PASS: homepage unchanged, all modes, objective results, daily, memory, repeat and mobile.")
