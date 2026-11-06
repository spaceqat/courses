/* Persistent course feedback entry; no credentials or network calls. */
(() => {
  const button = document.getElementById('persistent-feedback');
  const updateLabel = () => {
    button.textContent = typeof LANG !== 'undefined' && LANG === 'en' ? 'Submit feedback' : '提交反馈';
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
