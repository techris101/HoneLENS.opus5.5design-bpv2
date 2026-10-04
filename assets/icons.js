/* @ds-bundle: {"format":4,"namespace":"HoneLENS","components":[]} */
(function(){
  /* HoneLENS icon set v1 — original line icons, 24 grid, 1.75 stroke, square caps,
     mitre joins (echoes the HoneNurse bevel). currentColor only. No sparkles,
     no chat bubbles, no medical cliches. */
  var A='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">';
  var Z='</svg>';
  var P={
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    nomatch:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    unknown:'<path d="M8.75 8.75a3.25 3.25 0 1 1 4.7 2.9c-.95.45-1.45 1.2-1.45 2.2v.9"/><path d="M12 18v.5" stroke-width="2.5"/>',
    confirmed:'<circle cx="9" cy="8" r="3.25"/><path d="M3.5 19.5c.6-3 2.8-4.75 5.5-4.75 1.4 0 2.6.4 3.6 1.2"/><path d="M14.5 17l2 2 4-4.5"/>',
    retracted:'<circle cx="12" cy="12" r="8.25"/><path d="M6.25 6.25l11.5 11.5"/>',
    lock:'<rect x="5.5" y="10.5" width="13" height="9.5"/><path d="M8.5 10.5V7.75a3.5 3.5 0 0 1 7 0v2.75"/>',
    offline:'<path d="M7.25 18.5h9.5a3.75 3.75 0 0 0 .9-7.4A5.75 5.75 0 0 0 7 9.6a4.5 4.5 0 0 0 .25 8.9z"/><path d="M4 4l16 16"/>',
    alert:'<path d="M12 4l9 16H3z"/><path d="M12 10v4.25"/><path d="M12 17v.25" stroke-width="2.25"/>',
    danger:'<path d="M8 3.5h8l4.5 4.5v8L16 20.5H8L3.5 16V8z"/><path d="M12 8v5"/><path d="M12 16v.25" stroke-width="2.25"/>',
    info:'<circle cx="12" cy="12" r="8.25"/><path d="M12 11v5.5"/><path d="M12 7.75v.25" stroke-width="2.25"/>',
    assignment:'<path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 15.5h6"/>',
    clock:'<circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 2"/>',
    external:'<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M17.5 14v6h-13.5V6.5h6"/>',
    arrow:'<path d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5"/>',
    search:'<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    settings:'<path d="M4 7h9M18 7h2M4 17h3M12 17h8"/><circle cx="15.5" cy="7" r="2.25"/><circle cx="9.5" cy="17" r="2.25"/>',
    chevron:'<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    close:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    library:'<path d="M4.5 4.5h4v15h-4zM10 4.5h4v15h-4z"/><path d="M15.25 6.1l3.4-.9 3.1 13.6-3.4.9z"/>',
    inbox:'<path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5"/><path d="M6 5h12l2.5 8.5v6h-17v-6z"/>',
    copy:'<rect x="8.5" y="8.5" width="11.5" height="11.5"/><path d="M15.5 8.5V4H4v11.5h4.5"/>',
    download:'<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M4.5 16.5V20h15v-3.5"/>',
    retry:'<path d="M19 12a7 7 0 1 1-2.05-4.95"/><path d="M19 4.5v4h-4"/>',
    calc:'<rect x="5" y="3.5" width="14" height="17"/><path d="M8 7.5h8M8.5 12h1M14.5 12h1M8.5 16h1M14.5 16h1"/>'
  };
  function svg(name){ return P[name] ? A+P[name]+Z : ''; }
  function hydrate(root){
    (root||document).querySelectorAll('[data-icon]').forEach(function(el){
      if(el.getAttribute('data-hydrated')) return;
      el.innerHTML = svg(el.getAttribute('data-icon'));
      el.classList.add('hl-icon'); el.setAttribute('data-hydrated','1');
    });
  }
  /* One-time attention: one element at a time. Clears any other highlight, plays once, cleans up. */
  function highlight(el){
    if(!el) return; document.querySelectorAll('.hl-highlight').forEach(function(o){ o.classList.remove('hl-highlight'); }); void el.offsetWidth; el.classList.add('hl-highlight');
    el.addEventListener('animationend', function f(){ el.classList.remove('hl-highlight'); el.removeEventListener('animationend', f); });
  }
  window.HoneLENS = { icons:P, svg:svg, hydrate:hydrate, highlight:highlight, version:'1.0.0' };
  if(document.readyState !== 'loading') hydrate(document); else document.addEventListener('DOMContentLoaded', function(){ hydrate(document); });
})();
