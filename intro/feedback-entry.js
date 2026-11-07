/* Persistent course feedback entry; no credentials or network calls. */
(() => {
  const button = document.getElementById('persistent-feedback');
  const updateLabel = () => {
    const label = typeof LANG !== 'undefined' && LANG === 'en' ? 'Feedback' : '提交反馈';
    if (button.textContent !== label) button.textContent = label;
    const language = document.querySelector('.site-header [data-lang-switch]');
    if (language) {
      let group = language.closest('.feedback-language-actions');
      if (!group) {
        group = document.createElement('div');
        group.className = 'feedback-language-actions';
        language.before(group);
        group.append(language);
      }
      if (language.previousElementSibling !== button) group.insertBefore(button, language);
    }
    button.hidden = !language;
  };
  button.addEventListener('click', () => {
    const form = document.getElementById('course-feedback-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      form.querySelector('input:not([type="hidden"]), select, textarea, button')?.focus({ preventScroll: true });
      return;
    }
    const returnTo = typeof S !== 'undefined' && S.lesson && document.getElementById('scr')
      ? { id: S.lesson.id, step: S.i } : null;
    window.CourseFeedback?.open({ preview: true, returnTo });
  });
  updateLabel();
  new MutationObserver(updateLabel).observe(document.getElementById('app'), { childList: true, subtree: true });
})();
