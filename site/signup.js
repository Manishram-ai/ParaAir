// The sign-up and billing switches. ParaAir Cloud's GET /signup/status says whether anyone may create an account
// ("open", its SELF_SIGNUP) and whether real charges can happen ("billing": a payment processor is configured and
// checkout can sell). The site follows both:
// - data-signup="open" or "invite": "Get started" and the free trial when sign-up is open, "Ask for an invite" while
//   it is invite-only.
// - data-billing="on" or "off": the "nobody is charged yet" and "planned prices" wording shows only while billing is
//   off, whatever the sign-up switch says.
// An element marked with both shows only when both match. Until the answer comes, and whenever it can't (no script,
// offline, an error), the page stays as written: invite-only, billing off. A service that doesn't send "billing" yet
// keeps the earlier behaviour, where that wording followed the sign-up switch. Only marked elements change, and only
// their hidden attribute.
(() => {
  const marked = document.querySelectorAll('[data-signup], [data-billing]');
  if (!marked.length || !window.fetch) return;
  fetch('https://cloud.parafield.ai/signup/status', { credentials: 'omit', mode: 'cors' })
    .then((response) => (response.ok ? response.json() : null))
    .then((status) => {
      if (!status) return;
      const signup = status.open === true ? 'open' : 'invite';
      const billing = typeof status.billing === 'boolean' ? (status.billing ? 'on' : 'off') : (signup === 'open' ? 'on' : 'off');
      for (const element of marked) {
        const { signup: wantsSignup, billing: wantsBilling } = element.dataset;
        element.hidden = (wantsSignup !== undefined && wantsSignup !== signup) || (wantsBilling !== undefined && wantsBilling !== billing);
      }
    })
    .catch(() => {});
})();
