/* Progressive enhancement: the papers and navigation work without JavaScript. */
const citations = {
  'basuti-shl2026': 'Mohebbi, M., Majlesi, A., Basuti, A., Gharaee, I., Azizi, M. M., BabaAli, B., & Mohseni, P. (2026). Early and Late Fusion of Frozen Foundation Models for IMU-Based Human Activity Recognition. HASCA / UbiComp/ISWC 2026 Companion. Accepted; DOI issued: 10.1145/3798063.3842618.',
  'basuti-clinical-gait2026': 'Majlesi, A., Basuti, A., Mohebbi, M., Gharaee, I., & BabaAli, B. (2026). Phase-Aware Frozen Time-Series Foundation Models for Parameter-Efficient Clinical Gait Assessment. IEEE SPMB 2026. Accepted with mandatory revisions.',
  'basuti-fog2026': 'Mohebbi, M., Basuti, A., Azizi, M. M., & BabaAli, B. (2026). Leveraging Frozen Time-Series Foundation Models for IMU-Based Freezing of Gait Detection. ICBME 2026. Accepted for oral presentation.'
};
const feedback = document.querySelector('.copy-feedback');
const citationDialog = document.querySelector('#citation-dialog');
let feedbackTimer;
for (const button of document.querySelectorAll('[data-cite]')) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const text = citations[button.dataset.cite];
    if (!text) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      clearTimeout(feedbackTimer);
      feedback.textContent = 'Citation copied.';
      feedback.hidden = false;
      feedbackTimer = setTimeout(() => { feedback.hidden = true; }, 2600);
    } catch {
      const field = citationDialog.querySelector('textarea');
      field.value = text;
      citationDialog.showModal();
      field.focus();
      field.select();
    }
  });
}
document.querySelector('#close-citation').addEventListener('click', () => citationDialog.close());
