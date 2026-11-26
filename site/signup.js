// The sign-up and billing switches. ParaAir Cloud's GET /signup/status says whether anyone may create an account
// ("open", its SELF_SIGNUP), whether sign-ups are paused at their cap ("paused": then "open" is false although the
// service isn't invite-only) and whether a payment processor is selected ("billing": existing plans renew and can be
// charged). The site follows them:
// - data-signup="open" or "invite": "Get started" and the free trial when sign-up is open, "Ask for an invite" while
//   it isn't.
// - data-paused="yes" or "no": while sign-up isn't open, "sign-ups are paused" or "invite-only".
// - data-billing="on" or "off": the "nobody is charged yet" and "planned prices" wording shows only while billing is
//   off, whatever the sign-up switch says.
// An element marked with several shows only when all of them match. Until the answer comes, and whenever it can't (no
// script, offline, an error), the page stays as written: invite-only, not paused, billing off. A service that doesn't
// send "paused" or "billing" yet keeps the earlier behaviour: not paused, and the billing wording following the
// sign-up switch. Only marked elements change, and only their hidden attribute.
(() => {
  const marked = document.querySelectorAll('[data-signup], [data-paused], [data-billing]');
  if (!marked.length || !window.fetch) return;
  fetch('https://cloud.parafield.ai/signup/status', { credentials: 'omit', mode: 'cors' })
    .then((response) => (response.ok ? response.json() : null))
    .then((status) => {
      if (!status) return;
      const signup = status.open === true ? 'open' : 'invite';
      const switches = {
        signup,
        paused: status.paused === true ? 'yes' : 'no',
        billing: typeof status.billing === 'boolean' ? (status.billing ? 'on' : 'off') : (signup === 'open' ? 'on' : 'off'),
      };
      for (const element of marked) {
        element.hidden = Object.keys(switches).some((name) => {
          const wants = element.dataset[name];
          return wants !== undefined && wants !== switches[name];
        });
      }
    })
    .catch(() => {});
})();
