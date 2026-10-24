
<style>{`
  /* ================================================
     INSUREX REGISTRATION — INLINE CSS
  ================================================ */

  .ix-auth-card > h1 {
    color: #153b2c;
    letter-spacing: -0.8px;
    animation: ix-reg-heading .55s ease both;
  }

  .ix-auth-card > .sub {
    color: #718178;
    animation: ix-reg-heading .55s ease both;
    animation-delay: 80ms;
  }

  .ix-auth-card .stack {
    animation: ix-reg-form .6s cubic-bezier(.2,.7,.2,1) both;
    animation-delay: 100ms;
  }

  .ix-auth-card .stack > * {
    animation: ix-reg-field .4s ease both;
  }

  .ix-auth-card .stack > :nth-child(1) { animation-delay: 60ms; }
  .ix-auth-card .stack > :nth-child(2) { animation-delay: 110ms; }
  .ix-auth-card .stack > :nth-child(3) { animation-delay: 160ms; }
  .ix-auth-card .stack > :nth-child(4) { animation-delay: 210ms; }

  .ix-auth-card .form-grid > * {
    animation: ix-reg-field .4s ease both;
  }

  .ix-auth-card .form-grid > :nth-child(1) { animation-delay: 40ms; }
  .ix-auth-card .form-grid > :nth-child(2) { animation-delay: 90ms; }
  .ix-auth-card .form-grid > :nth-child(3) { animation-delay: 140ms; }
  .ix-auth-card .form-grid > :nth-child(4) { animation-delay: 190ms; }
  .ix-auth-card .form-grid > :nth-child(5) { animation-delay: 240ms; }
  .ix-auth-card .form-grid > :nth-child(6) { animation-delay: 290ms; }

  /* Bank field */

  .ix-bank-field {
    position: relative;
    width: 100%;
    min-width: 0;
  }

  .ix-bank-label {
    display: block;
    margin-bottom: 7px;
    color: #294c3b;
    font-size: 13px;
    font-weight: 700;
  }

  .ix-bank-trigger,
  .ix-bank-input {
    width: 100%;
    min-height: 46px;
    padding: 10px 12px;
    border: 1px solid #d5e3da;
    border-radius: 11px;
    background: #fff;
    color: #173b2c;
    font: inherit;
    transition: border-color .2s ease, box-shadow .2s ease,
      background .2s ease;
  }

  .ix-bank-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    cursor: pointer;
  }

  .ix-bank-trigger:hover {
    border-color: #78b99a;
    background: #fbfefc;
  }

  .ix-bank-trigger:focus-visible,
  .ix-bank-input:focus {
    outline: none;
    border-color: #087f5b;
    box-shadow: 0 0 0 3px rgba(8,127,91,.12);
  }

  .ix-bank-trigger:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .ix-bank-trigger-icon {
    flex-shrink: 0;
    color: #087f5b;
  }

  .ix-bank-trigger-avatar,
  .ix-bank-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 44px;
    min-height: 30px;
    padding: 3px 4px;
    border-radius: 8px;
    background: #e5f5eb;
    color: #087f5b;
    font-size: 10px;
    font-weight: 800;
    transition: transform .18s ease, background .18s ease;
  }

  .ix-bank-value,
  .ix-bank-placeholder {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ix-bank-value { color: #173b2c; }
  .ix-bank-placeholder { color: #819087; }

  .ix-bank-chevron {
    flex-shrink: 0;
    color: #087f5b;
    transition: transform .2s ease;
  }

  .ix-bank-chevron.is-open {
    transform: rotate(180deg);
  }

  /* Searchable dropdown portal */

  .ix-bank-menu {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    border: 1px solid #dcebe1;
    border-radius: 14px;
    background: #fff;
    color: #173b2c;
    box-shadow: 0 20px 55px rgba(12,62,41,.18);
    font-family: inherit;
    transform-origin: top center;
    animation: ix-reg-menu .2s cubic-bezier(.2,.7,.2,1) both;
  }

  .ix-bank-search {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 9px;
    padding: 11px 12px;
    border-bottom: 1px solid #e2eee6;
    background: #f6fbf7;
    color: #087f5b;
  }

  .ix-bank-search > svg { flex-shrink: 0; }

  .ix-bank-search input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    box-shadow: none;
    background: transparent;
    color: #173b2c;
    font: inherit;
    font-size: 13px;
  }

  .ix-bank-search input::placeholder { color: #94a39a; }

  .ix-bank-search button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 4px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #52695c;
    cursor: pointer;
    transition: background .15s ease, color .15s ease;
  }

  .ix-bank-search button:hover {
    background: #e5f5eb;
    color: #07563e;
  }

  .ix-bank-options {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: #fff;
    scrollbar-width: thin;
    scrollbar-color: #b9d8c5 #f7fbf8;
  }

  .ix-bank-options::-webkit-scrollbar { width: 6px; }
  .ix-bank-options::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background: #b9d8c5;
  }

  .ix-bank-option {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    min-height: 46px;
    padding: 9px 12px;
    border: none;
    border-bottom: 1px solid #f0f5f1;
    border-radius: 0;
    background: #fff;
    color: #173b2c;
    text-align: left;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background .16s ease, padding-left .16s ease;
  }

  .ix-bank-option:hover,
  .ix-bank-option:focus-visible {
    outline: none;
    background: #f0faf4;
  }

  .ix-bank-option:hover { padding-left: 16px; }

  .ix-bank-option[aria-selected="true"] {
    background: #eaf7ef;
    color: #07563e;
    font-weight: 700;
  }

  .ix-bank-option-name {
    flex: 1;
    min-width: 0;
    color: #294c3b;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .ix-bank-option[aria-selected="true"] .ix-bank-option-name {
    color: #07563e;
  }

  .ix-bank-selected {
    flex-shrink: 0;
    color: #087f5b;
    animation: ix-reg-check .22s ease both;
  }

  .ix-bank-other {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: none;
    border-top: 1px solid #e2eee6;
    background: #fff;
    color: #087f5b;
    text-align: left;
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
    transition: background .18s ease;
  }

  .ix-bank-other:hover { background: #effaf3; }

  .ix-bank-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    padding: 22px 12px;
    color: #718178;
    font-size: 13px;
    text-align: center;
  }

  .ix-bank-empty button,
  .ix-bank-reset {
    border: none;
    background: transparent;
    color: #087f5b;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .ix-bank-custom {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ix-bank-custom input {
    flex: 1;
    min-width: 0;
  }

  .ix-bank-error {
    display: block;
    margin-top: 6px;
    color: #c53030;
    font-size: 12px;
    animation: ix-reg-field .25s ease both;
  }

  /* Errors */

  .ix-auth-card .alert.error {
    border-radius: 11px;
    animation: ix-reg-error .3s ease both,
      ix-reg-shake .35s ease .1s both;
  }

  /* Navigation buttons */

  .ix-auth-card .stack .row {
    display: flex;
    gap: 12px;
    animation: ix-reg-field .45s ease both;
    animation-delay: 220ms;
  }

  .ix-auth-card .stack .row button {
    transition: transform .18s ease, box-shadow .18s ease;
  }

  .ix-auth-card .stack .row button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(8,127,91,.14);
  }

  .ix-auth-card .stack .row button:active:not(:disabled) {
    transform: translateY(0) scale(.99);
  }

  .ix-auth-card .stack .row button:disabled {
    cursor: not-allowed;
  }

  .ix-auth-card .stack .muted {
    color: #718178;
    font-size: 13px;
  }

  .ix-auth-card .stack .muted a {
    color: #087f5b;
    font-weight: 750;
    text-decoration: none;
    transition: color .18s ease;
  }

  .ix-auth-card .stack .muted a:hover {
    color: #07563e;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* Keyframes */

  @keyframes ix-reg-heading {
    from { opacity: 0; transform: translateY(9px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes ix-reg-form {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes ix-reg-field {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes ix-reg-menu {
    from { opacity: 0; transform: translateY(-5px) scale(.99); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes ix-reg-check {
    from { opacity: 0; transform: scale(.75); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes ix-reg-error {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes ix-reg-shake {
    0%, 100% { translate: 0 0; }
    25% { translate: -3px 0; }
    50% { translate: 3px 0; }
    75% { translate: -2px 0; }
  }

  /* Responsive */

  @media (max-width: 680px) {
    .ix-auth-card > h1 { font-size: 25px; }
    .ix-auth-card .stack .row { gap: 9px; }
    .ix-bank-menu { border-radius: 12px; }
  }

  @media (max-width: 480px) {
    .ix-bank-custom { flex-wrap: wrap; }
    .ix-bank-reset { padding: 5px 0; }
    .ix-bank-option { min-height: 48px; }
    .ix-bank-avatar,
    .ix-bank-trigger-avatar {
      width: 42px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ix-auth-card *,
    .ix-auth-card *::before,
    .ix-auth-card *::after,
    .ix-bank-menu,
    .ix-bank-menu * {
      animation-duration: .01ms !important;
      animation-delay: 0ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
      scroll-behavior: auto !important;
    }
  }
`}</style>
