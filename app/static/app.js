// kino frontend, plain javascript no build step so its easy to edit on the server
(() => {
  "use strict";

  // ---------------------------------------------------------- icons, simple sf symbols lookalikes
  const P = {
    play: "M8 5.14v13.72c0 .8.87 1.3 1.56.88l11.04-6.86a1.03 1.03 0 000-1.76L9.56 4.26A1.03 1.03 0 008 5.14z",
    pause: "M7 4h3.5a1 1 0 011 1v14a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1zm6.5 0H17a1 1 0 011 1v14a1 1 0 01-1 1h-3.5a1 1 0 01-1-1V5a1 1 0 011-1z",
    stop: "M7 6h10a1 1 0 011 1v10a1 1 0 01-1 1H7a1 1 0 01-1-1V7a1 1 0 011-1z",
    close: "M6.4 5L12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z",
    back10: "M12 5V2L7 6l5 4V7a6 6 0 11-6 6H4a8 8 0 108-8zm-1.6 10.7h-1v-3.3l-1 .3v-.8l1.9-.6h.1v4.4zm4.6-1.8c0 .6-.1 1.1-.4 1.4-.3.3-.6.5-1.1.5-.5 0-.8-.2-1.1-.5-.3-.3-.4-.8-.4-1.4v-.8c0-.6.1-1.1.4-1.4.3-.3.6-.5 1.1-.5s.8.2 1.1.5c.3.3.4.8.4 1.4v.8zm-1-.9c0-.4 0-.6-.1-.8-.1-.2-.2-.3-.4-.3s-.3.1-.4.3c-.1.2-.1.4-.1.8v1c0 .4 0 .6.1.8.1.2.2.3.4.3s.3-.1.4-.3c.1-.2.1-.4.1-.8v-1z",
    fwd10: "M12 5V2l5 4-5 4V7a6 6 0 106 6h2a8 8 0 11-8-8zm-1.6 10.7h-1v-3.3l-1 .3v-.8l1.9-.6h.1v4.4zm4.6-1.8c0 .6-.1 1.1-.4 1.4-.3.3-.6.5-1.1.5-.5 0-.8-.2-1.1-.5-.3-.3-.4-.8-.4-1.4v-.8c0-.6.1-1.1.4-1.4.3-.3.6-.5 1.1-.5s.8.2 1.1.5c.3.3.4.8.4 1.4v.8zm-1-.9c0-.4 0-.6-.1-.8-.1-.2-.2-.3-.4-.3s-.3.1-.4.3c-.1.2-.1.4-.1.8v1c0 .4 0 .6.1.8.1.2.2.3.4.3s.3-.1.4-.3c.1-.2.1-.4.1-.8v-1z",
    full: "M5 5h5v2H7v3H5V5zm9 0h5v5h-2V7h-3V5zM5 14h2v3h3v2H5v-5zm12 0h2v5h-5v-2h3v-3z",
    exitfull: "M8 5h2v5H5V8h3V5zm6 0h2v3h3v2h-5V5zM5 14h5v5H8v-3H5v-2zm9 0h5v2h-3v3h-2v-5z",
    vol: "M4 9h4l5-4v14l-5-4H4V9zm12.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4zM14 3.2v2.1a7 7 0 010 13.4v2.1a9 9 0 000-17.6z",
    mute: "M4 9h4l5-4v14l-5-4H4V9zm12.6.2l1.4-1.4 2 2 2-2 1.4 1.4-2 2 2 2-1.4 1.4-2-2-2 2-1.4-1.4 2-2-2-2z",
    cc: "M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm1.5 5v4c0 .8.7 1.5 1.5 1.5h2.5V14H7v-4h2.5V8.5H7c-.8 0-1.5.7-1.5 1.5zm7 0v4c0 .8.7 1.5 1.5 1.5h2.5V14H14v-4h2.5V8.5H14c-.8 0-1.5.7-1.5 1.5z",
    audio: "M12 3a9 9 0 00-9 9v6a3 3 0 003 3h2v-8H5v-1a7 7 0 0114 0v1h-3v8h2a3 3 0 003-3v-6a9 9 0 00-9-9z",
    download: "M11 4h2v8.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4 3.3 3.3V4zM5 18h14v2H5z",
    search: "M10 3a7 7 0 015.6 11.2l4.6 4.6-1.4 1.4-4.6-4.6A7 7 0 1110 3zm0 2a5 5 0 100 10 5 5 0 000-10z",
    refresh: "M12 5V2L8 6l4 4V7a5 5 0 11-5 5H5a7 7 0 107-7z",
    check: "M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.4z",
    plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z",
    link: "M10.6 13.4a1 1 0 001.4 1.4l3.5-3.5a3 3 0 00-4.2-4.2l-1.8 1.7 1.4 1.4 1.8-1.7a1 1 0 011.4 1.4l-3.5 3.5zm2.8-2.8a1 1 0 00-1.4-1.4l-3.5 3.5a3 3 0 004.2 4.2l1.8-1.7-1.4-1.4-1.8 1.7a1 1 0 01-1.4-1.4l3.5-3.5z",
    up: "M2 10h4v11H2zm6 11h9.2c.9 0 1.6-.6 1.9-1.4l2.6-7.2c.3-1-.4-2.1-1.5-2.1H14l.9-4.5c.2-.9-.2-1.8-1-2.2L13 3 8 9v12z",
    down: "M22 14h-4V3h4zM16 3H6.8c-.9 0-1.6.6-1.9 1.4L2.3 11.6c-.3 1 .4 2.1 1.5 2.1H10l-.9 4.5c-.2.9.2 1.8 1 2.2l.9.6 5-6V3z",
    love: "M1 11h3v9H1zm5 9h7.4c.8 0 1.4-.5 1.7-1.2l2-5.6c.3-.9-.4-1.9-1.4-1.9H12l.7-3.6c.1-.7-.2-1.4-.8-1.7L11 5.6 6 11v9zm8.6-14.7L19 1l.6.4c.6.4.9 1.1.8 1.7L19.8 6H23c1 0 1.7 1 1.4 1.9l-1.7 4.8-2-2 .6-1.6H16.6z",
    pencil: "M4 17.2V20h2.8l8.3-8.3-2.8-2.8L4 17.2zM19.7 7a1 1 0 000-1.4l-1.3-1.3a1 1 0 00-1.4 0L15.9 5.4l2.8 2.8L19.7 7z",
    gear: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7 7 0 00-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84a.47.47 0 00-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87a.47.47 0 00.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 00-.12-.61zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z",
    trash: "M9 3h6l1 2h4v2H4V5h4zm-3 6h12l-1 12H7z",
    wand: "M3 19.6L13.6 9l1.4 1.4L4.4 21zM15 3l.9 2.1L18 6l-2.1.9L15 9l-.9-2.1L12 6l2.1-.9zm5 6l.6 1.4L22 11l-1.4.6L20 13l-.6-1.4L18 11l1.4-.6z",
    airplay: "M5 4h14a2 2 0 012 2v9a2 2 0 01-2 2h-2.2l-1.6-2H19V6H5v9h3.8l-1.6 2H5a2 2 0 01-2-2V6a2 2 0 012-2zm7 9l6 7H6z",
    pip: "M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm1 2v10h16V7zm7 4h8v5h-8z",
    speed: "M12 4a9 9 0 00-7.8 13.5l1.7-1A7 7 0 1119 12h2a9 9 0 00-9-8zm4.2 4.3l-5.6 4.1a1.8 1.8 0 102.5 2.5z",
    skip: "M5 5.5v13l9-6.5zm10 0v13h3v-13z",
    lock: "M7 10V7a5 5 0 0110 0v3h1a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1v-9a1 1 0 011-1zm2 0h6V7a3 3 0 00-6 0z",
    more: "M6 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z",
    flag: "M5 3h2v18H5zm3 1h10l-2 4 2 4H8z",
    mic: "M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.9V21h2v-3.1A7 7 0 0019 11z",
    globe: "M12 2a10 10 0 100 20 10 10 0 000-20zm6.9 6h-3a15.7 15.7 0 00-1.4-3.6A8 8 0 0118.9 8zM12 4a14 14 0 011.9 4h-3.8A14 14 0 0112 4zM4.3 14a8.2 8.2 0 010-4h3.4a16.5 16.5 0 000 4zm.8 2h3a15.7 15.7 0 001.4 3.6A8 8 0 015.1 16zm3-8h-3a8 8 0 014.3-3.6A15.7 15.7 0 008.1 8zM12 20a14 14 0 01-1.9-4h3.8A14 14 0 0112 20zm2.3-6H9.7a14.7 14.7 0 010-4h4.6a14.7 14.7 0 010 4zm.3 5.6a15.7 15.7 0 001.4-3.6h3a8 8 0 01-4.4 3.6zm1.7-5.6a16.5 16.5 0 000-4h3.4a8.2 8.2 0 010 4z",
    eye: "M12 5C6.5 5 2.7 8.6 1 12c1.7 3.4 5.5 7 11 7s9.3-3.6 11-7c-1.7-3.4-5.5-7-11-7zm0 11.5a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm0-7a2.5 2.5 0 100 5 2.5 2.5 0 000-5z",
    kids: "M12 2a3 3 0 110 6 3 3 0 010-6zm-5 7h10l-1.5 6H14v7h-4v-7H8.5z",
    home: "M12 3.2l9 7.6V21a1 1 0 01-1 1h-5.5v-6.5h-5V22H4a1 1 0 01-1-1V10.8z",
    film: "M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm1 2v2h2V6zm12 0v2h2V6zM5 10v4h2v-4zm12 0v4h2v-4zM5 16v2h2v-2zm12 0v2h2v-2zM9 6v12h6V6z",
    tv: "M3 5h18a1 1 0 011 1v11a1 1 0 01-1 1h-6v2h3v2H6v-2h3v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z",
    bookmark: "M6 3h12a1 1 0 011 1v17.2a.5.5 0 01-.8.4L12 17.5l-6.2 4.1a.5.5 0 01-.8-.4V4a1 1 0 011-1z",
    server: "M4 3h16a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm2 3v1.5h2V6zM4 14h16a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1v-5a1 1 0 011-1zm2 3v1.5h2V17z",
    chevron: "M7.4 9.2L12 13.8l4.6-4.6L18 10.6l-6 6-6-6z",
    sun: "M12 7a5 5 0 110 10 5 5 0 010-10zm-1-5h2v3h-2zm0 17h2v3h-2zM2 11h3v2H2zm17 0h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 12.1l1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z",
    moon: "M14.5 2.5A9.5 9.5 0 1021.5 15 8 8 0 0114.5 2.5z",
    auto: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 2v16a8 8 0 010-16z",
    people: "M9 11a4 4 0 110-8 4 4 0 010 8zm8 0a3 3 0 110-6 3 3 0 010 6zM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6v1H2zm15.5-5.9c2.6.4 4.5 2.4 4.5 4.9v1h-4v-1c0-1.9-.2-3.4-.5-4.9z",
    back: "M15.4 4.6L8 12l7.4 7.4 1.4-1.4-6-6 6-6z",
    info: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2zm0-8h-2V7h2z",
    person: "M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0 2c-4.4 0-8 2.5-8 5.5V21h16v-1.5c0-3-3.6-5.5-8-5.5z",
    chevronR: "M9.2 6.6L13.8 11.2 9.2 15.8 10.6 17.2l6-6-6-6z",
    chevronL: "M14.8 6.6L10.2 11.2l4.6 4.6-1.4 1.4-6-6 6-6z",
    puzzle: "M20.5 11H19V7a2 2 0 00-2-2h-4V3.5a2.5 2.5 0 00-5 0V5H4a2 2 0 00-2 2v3.8h1.5a2.7 2.7 0 010 5.4H2V20a2 2 0 002 2h3.8v-1.5a2.7 2.7 0 015.4 0V22H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 000-5z",
  };
  const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;

  // Profile icons, made for kino. The order matters, profiles store the number
  const AV = [
    ["Popcorn", "#ff5f6d", "#ffc371", '<path d="M18 28h28l-4 26H22z" fill="#fff"/><path d="M24.5 28l1.8 26M32 28v26M39.5 28l-1.8 26" stroke="#ff5f6d" stroke-width="3"/><circle cx="22" cy="24" r="6" fill="#fff"/><circle cx="32" cy="19" r="7.5" fill="#fff"/><circle cx="42" cy="24" r="6" fill="#fff"/>'],
    ["Rocket", "#4facfe", "#5e5ce6", '<path d="M32 9c8.5 6.5 12.5 15.5 12.5 27L39 42H25l-5.5-6C19.5 24.5 23.5 15.5 32 9z" fill="#fff"/><circle cx="32" cy="27" r="5" fill="#5e5ce6"/><path d="M20 35l-6 11 9-3zM44 35l6 11-9-3z" fill="#fff" opacity=".8"/><path d="M27 44h10l-5 11z" fill="#ffd166"/>'],
    ["Ghost", "#8e2de2", "#4a00e0", '<path d="M18 52V30a14 14 0 0128 0v22l-5-4-4.5 4-4.5-4-4.5 4-4.5-4z" fill="#fff"/><circle cx="26.5" cy="30" r="3.2" fill="#4a00e0"/><circle cx="37.5" cy="30" r="3.2" fill="#4a00e0"/><ellipse cx="32" cy="39" rx="3" ry="2.2" fill="#4a00e0"/>'],
    ["Cat", "#f7971e", "#ffd200", '<path d="M15 27l4-15 11 8h4l11-8 4 15v9c0 9.4-7.6 17-17 17s-17-7.6-17-17z" fill="#fff"/><ellipse cx="25" cy="34" rx="3" ry="4" fill="#333"/><ellipse cx="39" cy="34" rx="3" ry="4" fill="#333"/><path d="M29.5 41h5L32 43.6z" fill="#ff7aa2"/>'],
    ["Planet", "#11998e", "#38ef7d", '<circle cx="32" cy="32" r="13" fill="#fff"/><ellipse cx="32" cy="32" rx="25" ry="7.5" fill="none" stroke="#fff" stroke-width="3.2" transform="rotate(-20 32 32)" opacity=".85"/><circle cx="27" cy="28" r="2.6" fill="#11998e" opacity=".5"/>'],
    ["Bolt", "#f12711", "#f5af19", '<path d="M36 7L15 36h14l-4 21 23-31H34z" fill="#fff"/>'],
    ["Star", "#fc5c7d", "#6a82fb", '<path d="M32 9l6.8 14.5 15.7 1.8-11.6 10.8 3.2 15.6L32 44l-14.1 7.7 3.2-15.6L9.5 25.3l15.7-1.8z" fill="#fff"/>'],
    ["Moon", "#141e30", "#3a6073", '<path d="M40 11a21 21 0 1013 31A17 17 0 0140 11z" fill="#fff"/><circle cx="48" cy="15" r="2" fill="#fff"/><circle cx="54" cy="25" r="1.4" fill="#fff"/>'],
    ["Wave", "#2193b0", "#6dd5ed", '<path d="M6 41c6.5-8 13-8 19.5 0s13 8 19.5 0 13-8 13-4v16H6z" fill="#fff"/><path d="M6 29c6.5-8 13-8 19.5 0s13 8 19.5 0 9-5.5 13-4" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".7"/>'],
    ["Peak", "#355c7d", "#c06c84", '<path d="M5 51l19-28 9 12 7-9 19 25z" fill="#fff"/><path d="M24 23l-4.4 6.5 4.4-1.5 4 2.5z" fill="#355c7d" opacity=".35"/><circle cx="47" cy="15" r="5" fill="#fff" opacity=".85"/>'],
    ["Flame", "#ee0979", "#ff6a00", '<path d="M32 7c4.5 10.5 14.5 14.5 14.5 29a14.5 14.5 0 01-29 0c0-7.5 4.2-11.6 6.4-14.6 1 5.2 4 7.5 6.2 7.5-2-8.4 0-14.9 1.9-21.9z" fill="#fff"/><path d="M32 33c2.5 4 6 6 6 11a6 6 0 01-12 0c0-4 3.5-6 6-11z" fill="#ff6a00"/>'],
    ["Gamer", "#00b09b", "#96c93d", '<path d="M20 21h24a10 10 0 0110 10l2.2 13a6.2 6.2 0 01-10.5 4.6L40.5 43h-17l-5.2 5.6A6.2 6.2 0 017.8 44L10 31a10 10 0 0110-10z" fill="#fff"/><path d="M21 28v9M16.5 32.5h9" stroke="#00b09b" stroke-width="3.4" stroke-linecap="round"/><circle cx="42" cy="30" r="2.7" fill="#00b09b"/><circle cx="47" cy="35.5" r="2.7" fill="#00b09b"/>'],
    ["Tune", "#c471f5", "#fa71cd", '<path d="M25 15l23-5.5v31.5a7.5 7.5 0 11-4.4-6.8V18.6L29.4 21.9v24.6a7.5 7.5 0 11-4.4-6.8z" fill="#fff"/>'],
    ["Director", "#232526", "#636b72", '<rect x="11" y="27" width="42" height="26" rx="3.5" fill="#fff"/><path d="M11 19.5l39-8.5 2.2 9.5-39 8.5z" fill="#fff"/><path d="M19 17.8l5.4 7.6M29 15.6l5.4 7.6M39 13.4l5.4 7.6" stroke="#3a3d40" stroke-width="3.2"/>'],
    ["Alien", "#56ab2f", "#a8e063", '<path d="M32 9c12.2 0 21 9 21 20.5C53 43 41.5 55 32 55S11 43 11 29.5C11 18 19.8 9 32 9z" fill="#fff"/><path d="M19.5 30c4.5 0 9.6 2.3 10.8 7.6-5.4 1-10.8-2.2-10.8-7.6zM44.5 30c-4.5 0-9.6 2.3-10.8 7.6 5.4 1 10.8-2.2 10.8-7.6z" fill="#2d5016"/>'],
    ["Crown", "#b8860b", "#ffd700", '<path d="M9 21l12 11 11-17 11 17 12-11-4.5 27h-37z" fill="#fff"/><rect x="13.5" y="50" width="37" height="4.5" rx="2.2" fill="#fff"/><circle cx="32" cy="38" r="3" fill="#b8860b"/>'],
    ["Leaf", "#134e5e", "#71b280", '<path d="M51 11C26 11 13 23.5 13 40.5c0 4.2 1 8.3 3.2 11.4 3.2-12.6 11.6-22 23-27.2C30 32 23.6 40.5 20.5 53c3 1.1 6.3 1.6 9.5 1.6C49 54.6 53.3 33.6 51 11z" fill="#fff"/>'],
    ["Dice", "#e53935", "#e35d5b", '<rect x="13" y="13" width="38" height="38" rx="9" fill="#fff"/><circle cx="23.5" cy="23.5" r="3.8" fill="#e53935"/><circle cx="32" cy="32" r="3.8" fill="#e53935"/><circle cx="40.5" cy="40.5" r="3.8" fill="#e53935"/><circle cx="40.5" cy="23.5" r="3.8" fill="#e53935"/><circle cx="23.5" cy="40.5" r="3.8" fill="#e53935"/>'],
  ];
  const avatar = (i, cls = "") => {
    const a = AV[i] || AV[0];
    return `<span class="av ${cls}" style="--a:${a[1]};--b:${a[2]}" aria-hidden="true"><svg viewBox="0 0 64 64">${a[3]}</svg></span>`;
  };

  // ---------------------------------------------------------- helpers
  const $ = (s, r = document) => r.querySelector(s);
  // Set when running inside the kino android app, and on android tv / fire tv
  const ANDROID = /KinoAndroid/.test(navigator.userAgent) && !!window.KinoAndroid;
  const TV = /KinoTV/.test(navigator.userAgent) || /[?&]tv=1/.test(location.search);
  // TVs and low memory devices get a lighter version: smaller pictures, no glass blur, fewer effects. Everything else is untouched
  const LITE = TV || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  if (LITE) document.documentElement.classList.add("lite");
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $("#app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (u, trim) => (u ? "/api/img?u=" + encodeURIComponent(u) + (trim ? "&trim=1" : "") : "");
  const hue = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bytes = (b, d = 1) => {
    if (b == null) return "–";
    const u = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; }
    return `${b.toFixed(i < 2 ? 0 : d)} ${u[i]}`;
  };
  const rate = (b) => (b == null ? "–" : bytes(b) + "/s");
  const clock = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
  };
  const dur = (s) => {
    s = Math.round(s || 0);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d) return `${d} d ${h} hr`;
    if (h) return `${h} hr ${m} min`;
    if (m) return `${m} min`;
    return `${s} sec`;
  };
  const when = (ts) => {
    if (!ts || typeof ts !== "number") return "Not scheduled";
    const d = new Date(ts * 1000), now = new Date();
    if (isNaN(d)) return "Not scheduled";
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const day = Math.round((new Date(d.toDateString()) - new Date(now.toDateString())) / 86400000);
    if (day === 0) return `Today at ${time}`;
    if (day === 1) return `Tomorrow at ${time}`;
    if (day === -1) return `Yesterday at ${time}`;
    return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + ` at ${time}`;
  };
  const ago = (ts) => {
    const s = Date.now() / 1000 - ts;
    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    return `${Math.floor(s / 86400)} d ago`;
  };
  // Some episode names come in ALL CAPS from cinemeta, this makes them read normally
  const SMALL = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "vs"]);
  const nice = (t) => {
    if (!t || t !== t.toUpperCase() || !/[A-Z]{3}/.test(t)) return t;
    return t.toLowerCase().split(" ").map((w, i) => (i && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
  };
  const epLabel = (s, e) => (s != null && e != null ? `S${s}, E${e}` : e != null ? `Episode ${e}` : "");

  let toastT;
  function toast(msg, ms = 3500) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => (t.hidden = true), ms);
  }

  async function api(url, body, method) {
    const opt = { method: method || (body !== undefined ? "POST" : "GET"), headers: { "X-Kino": "1" }, credentials: "same-origin" };
    if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    const r = await fetch(url, opt);
    let j = null;
    try { j = await r.json(); } catch (_) {}
    if (r.status === 409) { ME.profile = null; location.hash = "#/profiles"; throw new Error("pick profile"); }
    if (r.status === 401 && url.startsWith("/api/admin/") && !url.endsWith("/login")) {
      ME.admin = null;
      throw new Error((j && j.detail) || "Sign in as admin to do that");
    }
    if (!r.ok) { const e = new Error((j && j.detail) || `Request failed (${r.status})`); e.status = r.status; throw e; }
    if (r.status === 202) return { ...j, _pending: true };
    return j;
  }

  // Broken poster or logo images get swapped for a fallback, done here cause the csp blocks inline onerror
  document.addEventListener("error", (e) => {
    const el = e.target;
    if (el.tagName !== "IMG") return;
    if (el.dataset.alt && !el.dataset.altTried) { el.dataset.altTried = "1"; el.src = img(el.dataset.alt); return; }
    if (el.dataset.fallback === "text") {
      const s = document.createElement("h1");
      s.className = el.dataset.cls || "hero-name";
      s.textContent = el.alt;
      el.replaceWith(s);
    } else if (el.dataset.fallback === "hide") el.remove();
    else if (el.dataset.fallback === "ph") {
      const d = document.createElement("div");
      d.className = "ph"; d.style.setProperty("--h", hue(el.alt)); d.textContent = el.alt;
      el.replaceWith(d);
    }
  }, true);

  // ---------------------------------------------------------- sheets, the in app popups (no browser alerts)
  let sheetClose = null;
  function sheet(html, { wide = false, onClose } = {}) {
    closeSheet();
    const wrap = document.createElement("div");
    wrap.className = "sheet-wrap";
    wrap.innerHTML = `<div class="sheet ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap);
    const prev = document.activeElement;
    const close = () => { wrap.remove(); sheetClose = null; document.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); onClose && onClose(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("mousedown", (e) => { if (e.target === wrap) close(); });
    $$("[data-close]", wrap).forEach((b) => (b.onclick = close));
    sheetClose = close;
    const f = wrap.querySelector("input, button:not([data-close]), select");
    if (f) setTimeout(() => f.focus(), 30);
    return { el: wrap.firstElementChild, close };
  }
  const closeSheet = () => sheetClose && sheetClose();

  function confirmSheet(title, text, action, danger = true) {
    return new Promise((res) => {
      let done = false;
      const s = sheet(`<h2>${esc(title)}</h2><p class="secondary">${esc(text)}</p>
        <div class="actions end"><button class="btn secondary small" data-close>Cancel</button>
        <button class="btn ${danger ? "danger-solid" : "primary"} small" id="cfOk">${esc(action)}</button></div>`, { onClose: () => !done && res(false) });
      $("#cfOk", s.el).onclick = () => { done = true; s.close(); res(true); };
    });
  }

  // ---------------------------------------------------------- state
  const ME = { profile: null, admin: null, ip: null };
  let POLL = null, SYNC = null, HERO_T = null;
  // Kids profiles never see admin tools, even on a device where the admin is signed in
  const kidsMode = () => !!(ME.profile && ME.profile.kids);
  const isAdmin = () => !!ME.admin && !kidsMode();

  // ---------------------------------------------------------- shell
  // ---------------------------------------------------------- appearance, follows the device unless the person picks one
  const THEME_KEY = "kino-theme";
  const getTheme = () => { try { return localStorage.getItem(THEME_KEY) || "dark"; } catch (_) { return "dark"; } };
  function applyTheme(t = getTheme()) {
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    const dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? "#000000" : "#ffffff";
  }
  function setTheme(t) { try { localStorage.setItem(THEME_KEY, t); } catch (_) {} applyTheme(t); }
  applyTheme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applyTheme());
  const themePicker = (id) => `<div class="theme-pick" role="radiogroup" aria-label="Appearance" id="${id}">${[["auto", "Automatic", "auto"], ["light", "Light", "sun"], ["dark", "Dark", "moon"]]
    .map(([v, l, i]) => `<button role="radio" aria-checked="${getTheme() === v}" data-theme-set="${v}" title="${l}">${ic(i)}<span>${l}</span></button>`).join("")}</div>`;
  function wireThemePicker(root) {
    $$("[data-theme-set]", root).forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      setTheme(b.dataset.themeSet);
      $$("[data-theme-set]").forEach((x) => x.setAttribute("aria-checked", x.dataset.themeSet === b.dataset.themeSet));
    }));
  }

  // ---------------------------------------------------------- sidebar, like the apple tv app
  // It lives outside the page so it stays put between pages, a pill slides to the active item, and it shrinks to an
  // icon rail when you're not using it and grows back out over the content when you point at it or tab into it
  const GROUP_KEY = "kino-settings-open";
  const chrome = document.createElement("div");
  chrome.id = "chrome";
  document.body.prepend(chrome);
  let SIDE_KEY = "", SIDE_ACTIVE = "";

  function topbar(active) {
    const p = ME.profile;
    if (!p) return "";
    const key = [p.id, p.name, p.icon, p.kids, isAdmin()].join("|");
    if (key !== SIDE_KEY) { SIDE_KEY = key; renderSide(); }
    setActive(active);
    return "";
  }

  function renderSide() {
    const p = ME.profile;
    let open = false;
    try { open = localStorage.getItem(GROUP_KEY) === "1"; } catch (_) {}
    const item = (k, label, icon, extra = "") => `<a class="side-item" href="#/${k}" data-k="${k}"><span class="side-ic">${ic(icon)}</span><span class="side-lbl">${label}</span>${extra}</a>`;
    const main = [["search", "Search", "search"], ["home", "Home", "home"], ["movies", "Movies", "film"], ["shows", "TV Shows", "tv"], ["mylist", "My List", "bookmark"]];
    const group = [["settings", "Settings", "gear"]];
    if (isAdmin()) group.push(["sync", "Sync", "refresh"], ["server", "Server", "server"]);
    chrome.innerHTML = `<aside class="side" id="side" aria-label="Kino">
      <span class="side-shine" aria-hidden="true"></span>
      <div class="menu-wrap side-top">
        <button class="side-me" id="avatarBtn" aria-haspopup="true" aria-label="Profile menu">${avatar(p.icon, "xs")}<span class="side-lbl side-name">${esc(p.name)}</span><span class="side-lbl side-time" id="sideTime">${clockNow()}</span></button>
        <div class="menu drop side-menu" id="avatarMenu" hidden>
          <a href="#/profiles" class="mi">${ic("people")} Switch Profile</a>
          ${kidsMode() ? "" : isAdmin() ? `<button class="mi" id="adminOut">${ic("lock")} Sign Out of Admin</button>` : `<button class="mi" id="adminIn">${ic("lock")} Admin Sign In</button>`}
          <div class="menu-sep"></div>
          <div class="menu-label">Appearance</div>
          ${themePicker("menuTheme")}
        </div>
      </div>
      <div class="side-items">
        <span class="side-pill" id="sidePill" aria-hidden="true"></span>
        <nav class="side-nav" aria-label="Sections">${main.map(([k, l, i]) => item(k, l, i)).join("")}</nav>
        <div class="side-group ${open ? "open" : ""}" id="sideGroup">
          <button class="side-head" id="sideHead" aria-expanded="${open}"><span class="side-lbl">Settings</span>${ic("chevron")}</button>
          <div class="side-sub"><div class="side-sub-in">${group.map(([k, l, i]) => item(k, l, i, k === "sync" ? `<span class="side-badge" id="syncChip"><span class="dot"></span><span class="txt"></span></span>` : "")).join("")}</div></div>
        </div>
      </div>
    </aside>
    <nav class="tabbar" aria-label="Sections">
      ${[["home", "Home", "home"], ["movies", "Movies", "film"], ["shows", "TV Shows", "tv"], ["search", "Search", "search"]].map(([k, l, i]) =>
        `<a class="tb-item" href="#/${k}" data-k="${k}">${ic(i)}<span>${l}</span></a>`).join("")}
      <button class="tb-item" id="tbMore" data-k="more">${avatar(p.icon, "xs")}<span>${esc(p.name)}</span></button>
    </nav>`;
    wireSide();
  }

  // Moves the highlight pill to the current page with a spring, like the selection on apple tv
  function setActive(active) {
    SIDE_ACTIVE = active;
    const inGroup = ["settings", "sync", "server"].includes(active);
    if (inGroup) { const g = $("#sideGroup"); if (g && !g.classList.contains("open")) toggleGroup(true, false); }
    $$("#chrome [data-k]").forEach((a) => {
      const on = a.dataset.k === active || (a.dataset.k === "more" && ["mylist", "settings", "sync", "server"].includes(active));
      on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
    });
    placePill();
  }
  function placePill(instant) {
    const pill = $("#sidePill"), cur = $(`.side-item[aria-current="page"]`);
    if (!pill) return;
    if (!cur || !cur.offsetParent) { pill.style.opacity = "0"; return; }
    // Layout offsets instead of screen positions, so it still lines up when TVs zoom the whole page
    let top = 0;
    for (let el = cur; el && el !== pill.parentElement; el = el.offsetParent) top += el.offsetTop;
    if (instant) pill.style.transition = "none";
    pill.style.opacity = "1";
    pill.style.transform = `translateY(${top}px)`;
    pill.style.height = `${cur.offsetHeight}px`;
    if (instant) { void pill.offsetWidth; pill.style.transition = ""; }
  }
  function toggleGroup(open, save = true) {
    const g = $("#sideGroup");
    if (!g) return;
    g.classList.toggle("open", open);
    $("#sideHead").setAttribute("aria-expanded", open);
    if (save) { try { localStorage.setItem(GROUP_KEY, open ? "1" : "0"); } catch (_) {} }
    // The pill follows the item while the group slides open or shut
    const t0 = performance.now();
    const follow = () => { placePill(true); if (performance.now() - t0 < 450) requestAnimationFrame(follow); };
    requestAnimationFrame(follow);
  }

  // 24 hour clock in whatever time zone this device is set to
  const clockNow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  // Ticks over right on the minute instead of up to 20 seconds late
  (function tickClock() { const t = $("#sideTime"); if (t) t.textContent = clockNow(); setTimeout(tickClock, 60000 - (Date.now() % 60000) + 50); })();
  addEventListener("resize", () => placePill(true));

  function setOpen(open) {
    const side = $("#side");
    if (!side || side.classList.contains("open") === open) return;
    side.classList.toggle("open", open);
    // Opening the rail changes item sizes, so the pill follows it while it grows or shrinks
    const t0 = performance.now();
    const follow = () => { placePill(true); if (performance.now() - t0 < 520) requestAnimationFrame(follow); };
    requestAnimationFrame(follow);
  }

  function wireSide() {
    const side = $("#side"), b = $("#avatarBtn"), m = $("#avatarMenu");
    b.onclick = (e) => {
      e.stopPropagation(); m.hidden = !m.hidden; side.classList.toggle("pinned", !m.hidden);
      // With a remote the focus goes into the menu, back closes it again
      if (TV && !m.hidden) { const f = $(".mi", m); if (f) setTimeout(() => f.focus(), 30); }
    };
    m.addEventListener("click", (e) => e.stopPropagation());
    $$(".mi", m).forEach((x) => x.addEventListener("click", () => { m.hidden = true; side.classList.remove("pinned"); }));
    wireThemePicker(m);
    const ai = $("#adminIn"); if (ai) ai.onclick = () => adminLogin(() => route());
    const ao = $("#adminOut"); if (ao) ao.onclick = async () => { await api("/api/admin/logout", {}); ME.admin = null; toast("Signed out of admin"); route(); };
    $("#sideHead").onclick = () => toggleGroup(!$("#sideGroup").classList.contains("open"));
    // Opens when you point at it or tab into it with the keyboard, and folds away again as soon as you pick
    // something, like the apple tv sidebar. Clicking leaves focus on the link, so focus alone never keeps it open
    side.addEventListener("mouseenter", () => { if (!side.classList.contains("rest")) setOpen(true); });
    side.addEventListener("mouseleave", () => { side.classList.remove("rest"); setOpen(false); });
    side.addEventListener("focusin", (e) => { if (e.target.matches(":focus-visible")) setOpen(true); });
    side.addEventListener("focusout", (e) => { if (!side.contains(e.relatedTarget)) setOpen(false); });
    $$(".side-item", side).forEach((a) => a.addEventListener("click", () => {
      side.classList.add("rest");
      setOpen(false);
      a.blur();
    }));
    // Phones get a tab bar, the last tab opens everything else
    $("#tbMore").onclick = () => {
      const p = ME.profile;
      const row = (href, icon, label) => `<a class="more-row" href="${href}" data-close>${ic(icon)}<span>${label}</span>${ic("chevron")}</a>`;
      const sh = sheet(`<div class="more-head">${avatar(p.icon, "md")}<div><h2>${esc(p.name)}</h2><span class="secondary">${p.kids ? "Kids Profile" : "Profile"}</span></div></div>
        <div class="more-list">${row("#/mylist", "bookmark", "My List")}${row("#/settings", "gear", "Settings")}
          ${isAdmin() ? row("#/sync", "refresh", "Sync") + row("#/server", "server", "Server") : ""}
          ${row("#/profiles", "people", "Switch Profile")}</div>
        <div class="menu-label">Appearance</div>${themePicker("sheetTheme")}
        ${kidsMode() ? "" : `<div class="actions end" style="margin-top:18px">${isAdmin() ? `<button class="btn secondary small" id="mAdminOut">Sign Out of Admin</button>` : `<button class="btn secondary small" id="mAdminIn">${ic("lock")} Admin Sign In</button>`}</div>`}`);
      wireThemePicker(sh.el);
      const mi = $("#mAdminIn", sh.el); if (mi) mi.onclick = () => { sh.close(); adminLogin(() => route()); };
      const mo = $("#mAdminOut", sh.el); if (mo) mo.onclick = async () => { sh.close(); await api("/api/admin/logout", {}); ME.admin = null; toast("Signed out of admin"); route(); };
    };
  }

  function wireTopbar() {
    document.body.classList.add("with-side");
    window.onscroll = null;
    requestAnimationFrame(() => placePill(!$("#sidePill") || $("#sidePill").style.opacity !== "1"));
    updateSyncChip();
  }
  document.addEventListener("click", () => { const m = $("#avatarMenu"); if (m && !m.hidden) { m.hidden = true; $("#side").classList.remove("pinned"); } });

  function syncState(s) {
    if (!s) return { cls: "", text: "Sync" };
    if (s.paused) return { cls: "paused", text: "Paused" };
    const st = s.service.state;
    if (st === "active" || st === "activating") {
      const c = s.current;
      if (c && c.total) return { cls: "running", text: `${Math.floor((c.bytes / c.total) * 100)}%` };
      return { cls: "running", text: "Syncing" };
    }
    if (s.status && s.status.last_run && s.status.last_run.result === "error") return { cls: "error", text: "Error" };
    return { cls: "", text: "Idle" };
  }
  function updateSyncChip() {
    const c = $("#syncChip");
    if (!c || !SYNC) return;
    const s = syncState(SYNC);
    c.className = `side-badge ${s.cls}`;
    c.querySelector(".txt").textContent = s.cls === "running" || s.cls === "paused" || s.cls === "error" ? s.text : "";
  }

  // ---------------------------------------------------------- admin sign in
  function adminLogin(then) {
    const s = sheet(`<form id="adminForm" autocomplete="on">
      <div class="sheet-icon">${ic("lock")}</div>
      <h2>Admin Sign In</h2>
      <p class="secondary">For the sync, server and settings. Watching doesn't need this.</p>
      <label class="field"><span class="sr">Username</span><input name="username" autocomplete="username" placeholder="Username" required autocapitalize="none" spellcheck="false"></label>
      <label class="field"><span class="sr">Password</span><input name="password" type="password" autocomplete="current-password" placeholder="Password" required></label>
      <div class="form-err" id="adminErr" role="alert"></div>
      <div class="actions end"><button type="button" class="btn secondary small" data-close>Cancel</button><button class="btn primary small" type="submit">Sign In</button></div>
      </form>`);
    const f = $("#adminForm", s.el);
    f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = f.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        const r = await api("/api/admin/login", { username: f.username.value, password: f.password.value });
        ME.admin = r.admin;
        s.close();
        toast(`Signed in as ${r.admin}`);
        then && then();
      } catch (er) {
        $("#adminErr", s.el).textContent = er.message;
        btn.disabled = false;
        f.password.value = "";
        f.password.focus();
      }
    };
  }

  // ---------------------------------------------------------- who's watching
  async function pageProfiles(manage) {
    stopPoll();
    document.body.classList.remove("with-side");
    window.onscroll = null;
    const r = await api("/api/profiles");
    ME.admin = r.admin;
    app.innerHTML = `<main class="who">
      <div class="who-corner">${!!ME.admin
        ? `<span class="secondary">Signed in as ${esc(ME.admin)}</span><button class="btn secondary small" id="adminOut2">Sign Out</button>`
        : `<button class="btn secondary small" id="adminIn2">${ic("lock")} Admin</button>`}</div>
      <h1 class="who-title">${manage ? "Manage Profiles" : "Who's Watching?"}</h1>
      <div class="who-grid ${manage ? "managing" : ""}">
        ${r.profiles.map((p) => `<button class="who-tile" data-pid="${p.id}" aria-label="${manage ? "Edit" : "Watch as"} ${esc(p.name)}">
          <span class="who-av">${avatar(p.icon, "lg")}${manage ? `<span class="who-edit">${ic("pencil")}</span>` : ""}${p.kids ? `<span class="who-kids">Kids</span>` : ""}${p.locked && !manage ? `<span class="who-lock">${ic("lock")}</span>` : ""}</span>
          <span class="who-name">${esc(p.name)}</span></button>`).join("")}
        ${!!ME.admin ? `<button class="who-tile add" id="addProfile" aria-label="Add a profile"><span class="who-av"><span class="av lg addav">${ic("plus")}</span></span><span class="who-name">Add Profile</span></button>`
          : manage ? "" : `<button class="who-tile add" id="askProfile" aria-label="Ask for your own profile"><span class="who-av"><span class="av lg addav">${ic("plus")}</span></span><span class="who-name">Ask for a Profile</span></button>`}
      </div>
      <div class="who-actions">${manage ? `<button class="btn primary" id="doneManage">Done</button>` : ME.admin ? `<button class="btn outline" id="manageBtn">Manage Profiles</button>` : ""}</div>
    </main>`;
    $$(".who-tile[data-pid]").forEach((b) => (b.onclick = async () => {
      const p = r.profiles.find((x) => x.id === Number(b.dataset.pid));
      if (manage) return editProfile(p, () => pageProfiles(true));
      let res;
      if (p.locked) {
        res = await pinPad(`Enter ${p.name}'s Code`, (code) => api(`/api/profiles/${p.id}/select`, { pin: code }));
        if (!res) return;
      } else res = await api(`/api/profiles/${p.id}/select`, {});
      ME.profile = res.profile;
      location.hash = "#/home";
      if (location.hash === "#/home") route();
    }));
    const add = $("#addProfile"); if (add) add.onclick = () => editProfile(null, () => pageProfiles(manage));
    const ask = $("#askProfile"); if (ask) ask.onclick = () => askProfile();
    const mb = $("#manageBtn"); if (mb) mb.onclick = () => pageProfiles(true);
    const dm = $("#doneManage"); if (dm) dm.onclick = () => pageProfiles(false);
    const ai = $("#adminIn2"); if (ai) ai.onclick = () => adminLogin(() => pageProfiles(manage));
    const ao = $("#adminOut2"); if (ao) ao.onclick = async () => { await api("/api/admin/logout", {}); ME.admin = null; pageProfiles(manage); };
    const first = $(".who-tile"); if (first) first.focus();
    fitWho();
  }
  // Shrinks the profile icons until the whole picker fits on screen, so there's never any scrolling on it
  function fitWho() {
    const who = $(".who");
    if (!who) return;
    who.style.removeProperty("--who-av");
    let size = Math.min(150, Math.max(96, innerWidth * 0.12));
    for (let i = 0; i < 20 && document.documentElement.scrollHeight > innerHeight + 1 && size > 52; i++) {
      size -= 8;
      who.style.setProperty("--who-av", size + "px");
    }
  }
  addEventListener("resize", () => { if ($(".who")) fitWho(); });

  // A 4 digit code pad like the iphone lock screen. check gets the code and returns the result, or throws if wrong
  function pinPad(title, check, sub = "") {
    return new Promise((resolve) => {
      let code = "", busy = false, done = false;
      const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
      const s = sheet(`<div class="pin">
        <div class="pin-ic">${ic("lock")}</div><h2>${esc(title)}</h2>${sub ? `<p class="secondary">${esc(sub)}</p>` : ""}
        <div class="pin-dots" aria-live="polite">${[0, 1, 2, 3].map(() => "<i></i>").join("")}</div>
        <div class="pin-err" role="alert"></div>
        <div class="pin-keys">${keys.map((k) => k === "" ? "<span></span>" : `<button class="pin-key ${k === "del" ? "del" : ""}" data-k="${k}" aria-label="${k === "del" ? "Delete" : k}">${k === "del" ? ic("back") : k}</button>`).join("")}</div>
        <div class="actions end"><button class="btn secondary small" data-close>Cancel</button></div></div>`, { onClose: () => !done && resolve(null) });
      const dots = $$(".pin-dots i", s.el), err = $(".pin-err", s.el);
      const draw = () => dots.forEach((d, i) => d.classList.toggle("on", i < code.length));
      const press = async (k) => {
        if (busy) return;
        if (k === "del") code = code.slice(0, -1);
        else if (/\d/.test(k) && code.length < 4) code += k;
        err.textContent = "";
        draw();
        if (code.length === 4) {
          busy = true;
          try { const r = await check(code); done = true; s.close(); resolve(r); }
          catch (e) {
            err.textContent = e.message;
            $(".pin-dots", s.el).classList.add("shake");
            setTimeout(() => { const pd = $(".pin-dots", s.el); if (pd) pd.classList.remove("shake"); code = ""; draw(); busy = false; }, 500);
          }
        }
      };
      $$(".pin-key", s.el).forEach((b) => (b.onclick = () => press(b.dataset.k)));
      s.el.addEventListener("keydown", (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("del"); });
      setTimeout(() => { const f = $(".pin-key", s.el); if (f) f.focus(); }, 40);
    });
  }

  // Anyone can ask for there own profile, the admin approves it in Settings
  function askProfile() {
    let icon = Math.floor(Math.random() * AV.length);
    const s = sheet(`<h2>Ask for a Profile</h2><p class="secondary">Pick a name and an icon. It shows up once the admin approves it.</p>
      <div class="edit-top"><span id="apPreview">${avatar(icon, "lg")}</span>
        <label class="field grow"><span class="sr">Name</span><input id="apName" maxlength="24" placeholder="Your name"></label></div>
      <div class="icon-grid" role="radiogroup" aria-label="Profile icon">${AV.map((a, i) => `<button class="icon-pick" role="radio" aria-checked="${i === icon}" data-i="${i}" aria-label="${a[0]}">${avatar(i, "md")}</button>`).join("")}</div>
      <div class="form-err" id="apErr" role="alert"></div>
      <div class="actions end"><button class="btn secondary small" data-close>Cancel</button><button class="btn primary small" id="apSend">Ask</button></div>`, { wide: true });
    $$(".icon-pick", s.el).forEach((b) => (b.onclick = () => {
      icon = Number(b.dataset.i);
      $$(".icon-pick", s.el).forEach((x) => x.setAttribute("aria-checked", x === b));
      $("#apPreview", s.el).innerHTML = avatar(icon, "lg");
    }));
    $("#apSend", s.el).onclick = async () => {
      try { await api("/api/profiles/request", { name: $("#apName", s.el).value, icon }); s.close(); toast("Asked the admin, your profile shows up once it's approved", 5000); }
      catch (e) { $("#apErr", s.el).textContent = e.message; }
    };
  }

  // Edit or add a profile: name and icon. Editing your own works for everyone, adding and deleting is admin only
  function editProfile(p, done) {
    const isNew = !p;
    let icon = p ? p.icon : Math.floor(Math.random() * AV.length);
    const s = sheet(`<h2>${isNew ? "Add Profile" : "Edit Profile"}</h2>
      <div class="edit-top"><span id="epPreview">${avatar(icon, "lg")}</span>
        <label class="field grow"><span class="sr">Name</span><input id="epName" maxlength="24" placeholder="Name" value="${esc(p ? p.name : "")}"></label></div>
      ${ME.admin ? `<label class="set-row kids-row"><span><b>Kids Profile</b><span class="secondary">Only shows family and animated titles, and hides admin tools</span></span><input type="checkbox" class="switch" id="epKids" ${p && p.kids ? "checked" : ""}></label>` : ""}
      <h3 class="sheet-sub">Choose an Icon</h3>
      <div class="icon-grid" role="radiogroup" aria-label="Profile icon">${AV.map((a, i) => `<button class="icon-pick" role="radio" aria-checked="${i === icon}" data-i="${i}" aria-label="${a[0]}">${avatar(i, "md")}</button>`).join("")}</div>
      <div class="form-err" id="epErr" role="alert"></div>
      <div class="actions between">
        ${!isNew && isAdmin() ? `<button class="btn danger small" id="epDel">${ic("trash")} Delete Profile</button>` : "<span></span>"}
        <div class="actions"><button class="btn secondary small" data-close>Cancel</button><button class="btn primary small" id="epSave">Save</button></div>
      </div>`, { wide: true });
    $$(".icon-pick", s.el).forEach((b) => (b.onclick = () => {
      icon = Number(b.dataset.i);
      $$(".icon-pick", s.el).forEach((x) => x.setAttribute("aria-checked", x === b));
      $("#epPreview", s.el).innerHTML = avatar(icon, "lg");
    }));
    $("#epSave", s.el).onclick = async () => {
      const name = $("#epName", s.el).value;
      const kb = $("#epKids", s.el), kids = kb ? kb.checked : undefined;
      try {
        if (isNew) await api("/api/admin/profiles", { name, icon, kids: !!kids });
        else if (ME.admin && kb) {
          await api(`/api/admin/profiles/${p.id}`, { name, icon, kids }, "PUT");
          if (ME.profile && ME.profile.id === p.id) ME.profile = (await api("/api/me")).profile;
        }
        else if (ME.profile && ME.profile.id === p.id) { const r = await api("/api/profile", { name, icon }, "PUT"); ME.profile = r.profile; }
        else if (isAdmin()) await api(`/api/admin/profiles/${p.id}`, { name, icon }, "PUT");
        else {
          // Not admin and not your own profile, switch to it first then save
          const sel = await api(`/api/profiles/${p.id}/select`, {});
          ME.profile = sel.profile;
          const r = await api("/api/profile", { name, icon }, "PUT"); ME.profile = r.profile;
        }
        s.close(); toast(isNew ? "Profile added" : "Profile saved"); done && done();
      } catch (e) { $("#epErr", s.el).textContent = e.message; }
    };
    const del = $("#epDel", s.el);
    if (del) del.onclick = async () => {
      s.close();
      if (!(await confirmSheet(`Delete ${p.name}?`, "Their watch history, ratings and settings are deleted too. This can't be undone.", "Delete Profile"))) return editProfile(p, done);
      try { await api(`/api/admin/profiles/${p.id}`, undefined, "DELETE"); if (ME.profile && ME.profile.id === p.id) ME.profile = null; toast("Profile deleted"); done && done(); }
      catch (e) { toast(e.message, 5000); }
    };
  }

  // My List button, the same on library and addon title pages
  const listBtn = (on) => `<button class="round-btn ${on ? "on" : ""}" id="listBtn" aria-pressed="${!!on}" aria-label="${on ? "Remove from My List" : "Add to My List"}" title="${on ? "In My List" : "Add to My List"}">${ic(on ? "check" : "plus")}</button>`;
  function wireListBtn(body, key) {
    const b = $("#listBtn");
    if (!b) return;
    b.onclick = async () => {
      const on = b.getAttribute("aria-pressed") === "true";
      try {
        if (on) await api("/api/mylist?key=" + encodeURIComponent(key), undefined, "DELETE");
        else await api("/api/mylist", body);
      } catch (e) { toast(e.message, 5000); return; }
      b.outerHTML = listBtn(!on);
      wireListBtn(body, key);
      toast(on ? "Removed from My List" : "Added to My List");
    };
  }

  // Season dropdown, with how many episodes each one has
  function seasonPick(seasons, cur, eps) {
    const n = (s) => eps.filter((e) => (e.season ?? 0) === s).length;
    return `<label class="season-pick"><span class="sr">Season</span><select class="plain" id="seasonPick">${seasons.map((s) =>
      `<option value="${s}" ${s === cur ? "selected" : ""}>${s ? `Season ${s}` : "Extras"} (${n(s)} episode${n(s) === 1 ? "" : "s"})</option>`).join("")}</select></label>`;
  }

  // ---------------------------------------------------------- tiles
  // Remembers the name on each addon tile, so the title page can tell if an addon gave the wrong id for it
  const EXT_NAME = new Map();
  const extHref = (t) => { EXT_NAME.set(t.ext, t.name); return `#/discover/${t.ext.split("/").map(encodeURIComponent).join("/")}`; };
  function posterTile(t) {
    const art = t.poster
      ? `<img loading="lazy" src="${img(t.poster)}" alt="${esc(t.name)}" data-fallback="ph">`
      : `<div class="ph" style="--h:${hue(t.name)}">${esc(t.name)}</div>`;
    const sub = t.family ? t.family : t.external ? t.releaseInfo || (t.kind === "series" ? "TV Show" : "Movie")
      : t.kind === "series" ? `${t.count} episode${t.count === 1 ? "" : "s"}` : t.releaseInfo || "";
    const mark = (t.watched ? `<span class="tile-check" title="Watched">${ic("check")}</span>` : "") + (t.family ? `<span class="tile-love ${t.loved ? "loved" : ""}" title="${esc(t.family)}">${ic(t.loved ? "love" : "up")}</span>` : "");
    const href = t.external ? extHref(t) : `#/title/${t.id}`;
    return `<a class="tile poster ${t.external ? "ext" : ""} ${t.watched ? "is-watched" : ""}" href="${href}" ${t.external && t.poster ? `data-poster="${esc(t.poster)}"` : ""}><div class="art">${art}${mark}</div><div class="cap">${esc(t.name)}</div><div class="sub">${esc(sub)}</div></a>`;
  }
  function wideTile(t, opts = {}) {
    const bg = t.background
      ? `<img loading="lazy" src="${img(t.background)}" alt="${esc(t.name)}" data-fallback="ph">`
      : `<div class="ph" style="--h:${hue(t.name)}">${esc(t.name)}</div>`;
    const logo = t.logo && t.background && opts.progress == null ? `<img class="logo-over" loading="lazy" src="${img(t.logo, 1)}" alt="" data-fallback="hide">` : "";
    const bar = opts.progress != null && opts.progress > 0 ? `<div class="bar"><i style="width:${Math.min(100, opts.progress * 100)}%"></i></div>` : "";
    const href = opts.href || (t.external ? extHref(t) : `#/title/${t.id}`);
    const x = opts.hide ? `<button class="tile-x" data-hide="${opts.hide}" aria-label="Remove ${esc(t.name)} from Continue Watching" title="Remove from Continue Watching">${ic("close")}</button>` : "";
    return `<a class="tile landscape" href="${href}" ${opts.play ? `data-play="${opts.play}" data-tid="${t.id}"` : ""}><div class="art">${bg}${logo}${bar}${opts.play ? `<span class="tile-play">${ic("play")}</span>` : ""}${x}</div>
      <div class="cap">${esc(t.name)}</div><div class="sub">${esc(opts.sub || t.genres?.slice(0, 2).join(", ") || t.releaseInfo || "")}</div></a>`;
  }
  const metaLine = (t) => [t.kind === "series" ? "TV Show" : "Movie", t.releaseInfo, t.genres?.slice(0, 2).join(", "), t.runtime, t.rating ? `IMDb ${t.rating}` : ""].filter(Boolean);

  // ---------------------------------------------------------- home
  async function pageHome() {
    const h = await api("/api/home");
    if (h.empty) {
      app.innerHTML = topbar("home") + `<main class="page"><div class="empty">
        <h2>${h.scanning ? "Scanning your Storage Box" : !h.mounted ? "The Storage Box isn't connected" : "Nothing here yet"}</h2>
        <p>${h.error ? esc(h.error) : h.scanning ? "This takes a moment the first time." : "Videos show up here once the sync has downloaded them."}</p>
        ${isAdmin() ? `<a class="btn secondary small" href="#/sync">Open Sync</a>` : ""}</div></main>`;
      wireTopbar();
      if (h.scanning) setTimeout(() => location.hash === "#/home" && route(), 4000);
      return;
    }
    const heroes = h.hero;
    app.innerHTML = topbar("home") + `
      ${!h.mounted ? `<div class="banner" role="status">The Storage Box isn't connected right now, it's being reconnected automatically.</div>` : ""}
      ${h.storage && h.storage.warn && isAdmin() ? `<a class="banner warn" href="#/server" role="status">${ic("info")} The Storage Box is ${Math.round(h.storage.pct)}% full, ${bytes(h.storage.free)} left. <b>Review what to clear</b></a>` : ""}
      <section class="hero" id="hero" aria-roledescription="carousel" aria-label="Featured">
        ${heroes.map((t, i) => heroSlide(t, i)).join("")}
        ${heroes.length > 1 ? `<div class="hero-dots glass" role="tablist">${heroes.map((t, i) => `<button role="tab" aria-selected="${i === 0}" aria-label="Show ${esc(t.name)}" data-dot="${i}"><i></i></button>`).join("")}</div>` : ""}
      </section>
      <main class="page under-hero" style="padding-top:8px">
        ${h.shelves.map((s) => s.style === "fresh" ? freshShelf(s) : `<section class="shelf" aria-label="${esc(s.title)}"><h2 class="section-title">${esc(s.title)}${s.source ? ` <span class="from">${esc(s.source)}</span>` : ""}${s.more ? ` <a href="${s.more}">See All</a>` : ""}</h2>
          <div class="row ${s.style === "poster" ? "posters" : "wide"}">${s.items.map((t) => s.style === "poster" ? posterTile(t)
            : s.style === "continue" ? wideTile(t, { progress: t.dur ? t.pos / t.dur : 0, hide: TV ? null : t.file_id, href: t.stream ? extHref(t) : undefined,
                sub: t.kind === "series" ? `${epLabel(t.season, t.episode)}${t.next_episode ? " · Next episode" : t.dur ? ` · ${clock(t.dur - t.pos)} left` : ""}` : `${clock(t.dur - t.pos)} left` })
            : wideTile(t)).join("")}${TV && s.more ? moreCard(s.more, s.style === "poster") : ""}</div></section>`).join("")}
      </main>`;
    wireTopbar();
    startHero(heroes.length);

    // Taking something out of Continue Watching, it comes back if they start watching it again
    app.querySelectorAll("[data-hide]").forEach((b) => b.addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation();
      await api("/api/continue/hide", { file_id: b.dataset.hide }).catch(() => {});
      toast("Removed from Continue Watching");
      route();
    }));
    app.querySelectorAll("[data-play]").forEach((a) => a.addEventListener("click", async (e) => {
      if (e.target.closest("[data-hide]")) return;
      e.preventDefault();
      if (a.dataset.play.startsWith("s")) return playFile(a.dataset.play, {});
      const t = await api(`/api/title/${a.dataset.tid}`);
      const f = t.files.find((x) => x.id === a.dataset.play);
      playFile(a.dataset.play, { title: t, from: f && f.progress ? f.progress.pos : 0 });
    }));
    app.querySelectorAll("[data-heroresume]").forEach((b) => (b.onclick = async () => {
      const fid = b.dataset.heroresume;
      if (fid.startsWith("s")) return playFile(fid, {});
      const t = await api(`/api/title/${b.dataset.tid}`);
      const f = t.files.find((x) => x.id === fid);
      playFile(fid, { title: t, from: f && f.progress ? f.progress.pos : 0 });
    }));
    app.querySelectorAll("[data-heroplay]").forEach((b) => (b.onclick = async () => {
      const t = await api(`/api/title/${b.dataset.heroplay}`);
      const f = nextUp(t);
      if (f) playFile(f.id, { title: t, from: f.progress ? f.progress.pos : 0 });
    }));
    if (isAdmin()) startPoll(pollHomeSync, 5000);
  }

  // On a tv the See All link at the top is hard to reach, so rows end with a card that does the same
  const moreCard = (href, poster, attr = "") => `<a class="tile more-card ${poster ? "poster" : "landscape"}" ${href ? `href="${href}"` : 'href="#" role="button"'} ${attr}><div class="art"><span class="more-in">${ic("chevronR")}<b>View More</b></span></div><div class="cap">&nbsp;</div></a>`;

  // Floating back button on title pages, phones dont have the sidebar to get out with
  const backBtn = () => `<button class="page-back glass" data-goback aria-label="Back">${ic("back")}</button>`;
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-goback]")) return;
    history.length > 1 ? history.back() : (location.hash = "#/home");
  });

  // Hero artwork. Wide art on most screens, the poster on portrait phones so it isn't cropped to a thin strip
  function heroArt(t, lazy) {
    const wide = t.background ? (LITE ? t.background : t.background.replace("/medium/", "/large/")) : null;
    const tall = t.poster || null;
    if (!wide && !tall) return "";
    return `<picture>${tall && wide ? `<source media="(max-width: 760px) and (orientation: portrait)" srcset="${img(tall)}">` : ""}<img ${lazy ? 'loading="lazy"' : ""} src="${img(wide || tall)}" data-alt="${esc(t.background || "")}" alt="" data-fallback="hide" ${!wide ? 'class="tall"' : ""}></picture>`;
  }

  // One slide of the home hero. The first one is whatever was watched last, with its own continue style
  const HERO_MS = 6500;
  function heroSlide(t, i) {
    const tab = i ? 'tabindex="-1"' : "";
    const link = t.external ? extHref(t) : `#/title/${t.id}`;
    const left = t.dur ? Math.max(0, t.dur - t.pos) : 0;
    const what = t.cont ? [t.season != null ? epLabel(t.season, t.episode) : "", left ? `${clock(left)} left` : ""].filter(Boolean).join(" · ") : "";
    return `<div class="hero-slide ${i === 0 ? "on" : ""} ${t.cont ? "is-cont" : ""}" data-i="${i}" ${i ? 'aria-hidden="true"' : ""}>
      <div class="hero-bg ${t.poster ? "has-tall" : ""}">${heroArt(t, i > 0)}</div>
      <div class="hero-content">
        ${t.cont ? `<span class="hero-kicker glass">${ic("play")} Continue Watching</span>` : ""}
        ${t.logo ? `<img class="hero-logo" src="${img(t.logo, 1)}" alt="${esc(t.name)}" data-fallback="text">` : `<h1 class="hero-name">${esc(t.name)}</h1>`}
        ${t.cont ? `<div class="hero-meta"><span>${esc(what)}</span></div>
          <div class="hero-prog"><i style="width:${t.dur ? Math.min(100, (t.pos / t.dur) * 100) : 0}%"></i></div>`
          : `<div class="hero-meta">${metaLine(t).map((m, j) => `<span class="${j ? "dot-sep" : ""}">${esc(m)}</span>`).join("")}</div>
          ${t.description ? `<p class="hero-desc">${esc(t.description)}</p>` : ""}`}
        <div class="actions">
          ${t.cont ? `<button class="btn primary" data-heroresume="${t.file_id}" data-tid="${t.id || ""}" ${tab}>${ic("play")} ${t.next_episode ? "Play" : "Resume"}${t.season != null ? " " + esc(epLabel(t.season, t.episode)) : ""}</button>`
            : `<button class="btn primary" data-heroplay="${t.id}" ${tab}>${ic("play")} Play</button>`}
          <a class="btn secondary glass-btn-lg" href="${link}" ${tab}>More Info</a>
          ${t.cont && !TV ? `<button class="round-btn" data-hide="${t.file_id}" ${tab} aria-label="Remove from Continue Watching" title="Remove from Continue Watching">${ic("close")}</button>` : ""}
        </div>
      </div></div>`;
  }

  // New episodes for shows in My List, shown big at the top of Home so they're hard to miss
  function freshShelf(s) {
    return `<section class="shelf fresh" aria-label="${esc(s.title)}"><h2 class="section-title">${esc(s.title)}</h2>
      <div class="row fresh-row">${s.items.map((t) => `<a class="fresh-card" href="#/title/${t.id}" data-play="${t.file_id}" data-tid="${t.id}">
        <div class="fresh-bg">${t.thumbnail || t.background ? `<img loading="lazy" src="${img(t.thumbnail || t.background)}" alt="" data-fallback="hide">` : ""}</div>
        <div class="fresh-body">
          <span class="fresh-pill">${t.new_count} New Episode${t.new_count === 1 ? "" : "s"}</span>
          ${t.logo ? `<img class="fresh-logo" src="${img(t.logo, 1)}" alt="${esc(t.name)}" data-fallback="text" data-cls="fresh-name">` : `<div class="fresh-name">${esc(t.name)}</div>`}
          <div class="fresh-ep">${esc(epLabel(t.season, t.episode))}${t.ep_name ? ` · ${esc(nice(t.ep_name))}` : ""}</div>
          <span class="btn primary small fresh-play">${ic("play")} Play</span>
        </div></a>`).join("")}</div></section>`;
  }

  // Rotating hero, slow crossfade every 9 seconds, stops when you hover or focus it
  function startHero(n) {
    clearInterval(HERO_T);
    if (n < 2) return;
    let i = 0, paused = false;
    const hero = $("#hero");
    const show = (k) => {
      i = (k + n) % n;
      $$(".hero-slide", hero).forEach((s, j) => {
        s.classList.toggle("on", j === i);
        s.setAttribute("aria-hidden", j !== i);
        $$("a,button", s).forEach((b) => (j === i ? b.removeAttribute("tabindex") : b.setAttribute("tabindex", "-1")));
      });
      $$("[data-dot]", hero).forEach((d, j) => d.setAttribute("aria-selected", j === i));
    };
    const restart = () => {
      clearInterval(HERO_T);
      if (reduceMotion()) return;
      HERO_T = setInterval(() => { if (!paused && !document.hidden && $("#hero")) show(i + 1); else if (!$("#hero")) clearInterval(HERO_T); }, HERO_MS);
    };
    $$("[data-dot]", hero).forEach((d) => (d.onclick = () => { show(Number(d.dataset.dot)); restart(); }));
    // Keeps rotating like apple tv, only stops while a button in it has keyboard focus
    hero.addEventListener("focusin", () => { paused = true; hero.classList.add("paused"); });
    hero.addEventListener("focusout", () => { paused = false; hero.classList.remove("paused"); });
    hero.style.setProperty("--hero-ms", `${HERO_MS}ms`);
    restart();
  }

  async function pollHomeSync() {
    SYNC = await api("/api/admin/sync");
    updateSyncChip();
    const el = null;
    if (!el) return;
    const c = SYNC.current;
    if (!c) { el.hidden = true; return; }
    const pct = c.total ? c.bytes / c.total : 0;
    el.hidden = false;
    el.innerHTML = `${SYNC.poster ? `<img src="${img(SYNC.poster)}" alt="" data-fallback="hide">` : ""}
      <div class="grow"><div class="lbl">Downloading to your Storage Box</div>
      <div class="nm">${esc(c.title || c.name)}${c.episode != null ? ` ${esc(epLabel(c.season, c.episode))}` : ""}</div>
      <div class="progress thin"><i style="width:${pct * 100}%"></i></div>
      <div class="lbl">${Math.floor(pct * 100)}% · ${rate(c.speed)}</div></div>`;
  }

  // Picks what Play should start, the first unfinished episode or the movie
  function nextUp(t) {
    const files = t.files;
    if (!files.length) return null;
    if (t.kind === "series") {
      const started = files.filter((f) => f.progress);
      if (started.length) return started.sort((a, b) => b.progress.updated - a.progress.updated)[0];
      const firstUnwatched = files.find((f) => !f.watched);
      return firstUnwatched || files[0];
    }
    return files[0];
  }

  // ---------------------------------------------------------- movies and shows
  async function pageBrowse(kind) {
    const lib = await api("/api/library");
    const list = lib.titles.filter((t) => t.kind === kind);
    // Genres as chips, the most common first. Picking more than one shows titles that have all of them
    const gc = {};
    list.forEach((t) => (t.genres || []).forEach((g) => (gc[g] = (gc[g] || 0) + 1)));
    const genres = Object.keys(gc).sort((a, b) => gc[b] - gc[a] || a.localeCompare(b));
    const yr = (t) => parseInt(String(t.releaseInfo || t.year || "").slice(0, 4), 10) || 0;
    const decades = [...new Set(list.map(yr).filter(Boolean).map((y) => Math.floor(y / 10) * 10))].sort((a, b) => b - a);
    const hasExt = list.some((t) => t.external) && list.some((t) => !t.external);
    const noun = kind === "movie" ? "movie" : "show";
    app.innerHTML = topbar(kind === "movie" ? "movies" : "shows") + `<main class="page">
      <h1 class="large-title">${kind === "movie" ? "Movies" : "TV Shows"}</h1>
      <div class="toolbar">
        <label class="search">${ic("search")}<span class="sr">Filter</span><input id="q" type="search" placeholder="Filter ${noun}s"></label>
        <select class="plain" id="sort" aria-label="Sort"><option value="added">Recently Added</option><option value="name">Name</option><option value="year">Newest</option><option value="old">Oldest</option><option value="rating">Rating</option></select>
        <select class="plain" id="decade" aria-label="Decade"><option value="">Any Year</option>${decades.map((d) => `<option value="${d}">${d}s</option>`).join("")}</select>
        <select class="plain" id="minr" aria-label="Rating"><option value="">Any Rating</option><option value="6">6+ on IMDb</option><option value="7">7+ on IMDb</option><option value="8">8+ on IMDb</option></select>
        ${hasExt ? `<select class="plain" id="src" aria-label="Where"><option value="">Library and Addons</option><option value="lib">In Your Library</option><option value="ext">From Addons</option></select>` : ""}
        <select class="plain" id="seen" aria-label="Watched"><option value="">Watched and Unwatched</option><option value="no">Unwatched</option><option value="yes">Watched</option></select>
        <span class="secondary" id="count" style="font-size:15px"></span>
      </div>
      ${genres.length ? `<div class="chips" role="group" aria-label="Genres"><button class="chip on" data-g="" aria-pressed="true">All Genres</button>${genres.map((g) => `<button class="chip" data-g="${esc(g)}" aria-pressed="false">${esc(g)} <span>${gc[g]}</span></button>`).join("")}</div>` : ""}
      <div class="grid" id="grid"></div></main>`;
    wireTopbar();
    const picked = new Set();
    const val = (id) => ($("#" + id) ? $("#" + id).value : "");
    const draw = () => {
      const q = val("q").trim().toLowerCase(), s = val("sort"), w = val("seen"), dec = Number(val("decade")) || 0, mr = Number(val("minr")) || 0, src = val("src");
      let r = list.filter((t) => (!q || t.name.toLowerCase().includes(q)) && [...picked].every((g) => (t.genres || []).includes(g))
        && (!w || (w === "yes") === !!t.watched) && (!dec || (yr(t) >= dec && yr(t) < dec + 10)) && (!mr || (parseFloat(t.rating) || 0) >= mr)
        && (!src || (src === "ext") === !!t.external));
      r = r.slice().sort((a, b) => s === "name" ? a.name.localeCompare(b.name) : s === "year" ? yr(b) - yr(a) : s === "old" ? (yr(a) || 9999) - (yr(b) || 9999)
        : s === "rating" ? (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0) : b.added - a.added);
      $("#grid").innerHTML = r.length ? r.map(posterTile).join("") : `<div class="empty" style="grid-column:1/-1"><h2>No matches</h2><p>Try a different filter or genre.</p></div>`;
      $("#count").textContent = `${r.length} ${noun}${r.length === 1 ? "" : "s"}`;
    };
    $$(".chip[data-g]").forEach((c) => (c.onclick = () => {
      const g = c.dataset.g;
      if (!g) picked.clear();
      else picked.has(g) ? picked.delete(g) : picked.add(g);
      $$(".chip[data-g]").forEach((x) => { const on = x.dataset.g ? picked.has(x.dataset.g) : !picked.size; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
      draw();
    }));
    ["q", "sort", "seen", "decade", "minr", "src"].forEach((id) => $("#" + id) && $("#" + id).addEventListener("input", draw));
    draw();
  }

  // ---------------------------------------------------------- my list
  async function pageMyList() {
    const r = await api("/api/mylist");
    app.innerHTML = topbar("mylist") + `<main class="page"><h1 class="large-title">My List</h1>
      ${r.items.length ? `<div class="grid">${r.items.map((t) => posterTile(t).replace('<div class="art">', `<div class="art">${t.new_count ? `<span class="new-dot">${t.new_count} New</span>` : ""}`)).join("")}</div>`
        : `<div class="empty"><h2>Nothing in your list yet</h2><p>Use the + button on any film or show to keep it here.</p></div>`}</main>`;
    wireTopbar();
  }

  // ---------------------------------------------------------- search
  // Results come in rows like apple tv: Movies, TV Shows, People and Episodes. Library and addon results are mixed
  // into the same rows and sorted by how well they match plus how popular they are, the best row goes first
  const searchRow = (id, title, items, tile, extra = "") => items.length ? `<section class="shelf srow" data-srow="${id}" aria-label="${esc(title)}">
      <h2 class="section-title">${esc(title)} <span class="from">${items.length}</span>${items.length > 6 ? ` <button class="see-all" data-viewall="${id}">View All</button>` : ""}${extra}</h2>
      <div class="row ${tile === "wide" ? "wide" : "posters"}">${items.map(tile === "wide" ? epTile : tile === "person" ? personTile : posterTile).join("")}${TV && items.length > 6 ? moreCard(null, tile !== "wide", `data-viewall="${id}"`) : ""}</div></section>` : "";
  const epTile = (e) => `<a class="tile landscape" href="#/title/${e.title_id}" data-play="${e.file_id}" data-tid="${e.title_id}"><div class="art">${e.thumbnail ? `<img loading="lazy" src="${img(e.thumbnail)}" alt="${esc(e.name)}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(e.show)}">${esc(e.name)}</div>`}<span class="tile-play">${ic("play")}</span></div>
      <div class="cap">${esc(nice(e.name))}</div><div class="sub">${esc(e.show)} · ${esc(epLabel(e.season, e.episode))}</div></a>`;
  const personTile = (p) => `<a class="tile person" href="#/person/${encodeURIComponent(p.name)}"><div class="art">${p.poster ? `<img loading="lazy" src="${img(p.poster)}" alt="" data-fallback="hide">` : ""}<span class="person-ic">${ic("person")}</span></div>
      <div class="cap">${esc(p.name)}</div><div class="sub">${esc(p.role)} · ${p.count} title${p.count === 1 ? "" : "s"}</div></a>`;

  async function pageSearch() {
    const start = decodeURIComponent((location.hash.split("?q=")[1] || ""));
    app.innerHTML = topbar("search") + `<main class="page">
      <div class="search big">${ic("search")}<label class="sr" for="sq">Search</label><input id="sq" type="search" placeholder="Films, shows, actors, directors and more" value="${esc(start)}" autocomplete="off">
        <button class="mic-btn" id="micBtn" type="button" aria-label="Search by Voice" title="Search by Voice" hidden>${ic("mic")}</button></div>
      <div id="sres"></div></main>`;
    wireTopbar();
    const input = $("#sq");
    if (!TV) input.focus();
    setupMic(input, () => run());
    let t, seq = 0;
    const run = async () => {
      const q = input.value.trim();
      history.replaceState(null, "", "#/search" + (q ? "?q=" + encodeURIComponent(q) : ""));
      const box = $("#sres");
      if (!q) { ++seq; return drawStart(box); }
      const my = ++seq;
      box.innerHTML = `<div class="sk sk-line" style="width:200px;margin-top:32px"></div><div class="row posters">${Array.from({ length: 8 }, () => '<div class="sk sk-poster"></div>').join("")}</div>`;
      const r = await api("/api/search?q=" + encodeURIComponent(q));
      if (my !== seq || !$("#sres")) return;
      let ext = [], extDone = false;
      const draw = () => {
        const all = r.titles.concat(ext).sort((a, b) => (b.score || 0) - (a.score || 0));
        const movies = all.filter((x) => x.kind === "movie"), shows = all.filter((x) => x.kind === "series");
        const rows = [
          { s: movies.length ? movies[0].score : -1, html: searchRow("movies", "Movies", movies) },
          { s: shows.length ? shows[0].score : -1, html: searchRow("shows", "TV Shows", shows) },
        ].sort((a, b) => b.s - a.s).map((x) => x.html);
        const people = searchRow("people", "Cast and Crew", r.people || [], "person");
        // Someone typing an actor's name wants the people first
        const peopleFirst = (r.people || []).length && (!all.length || (all[0].score || 0) < 60);
        box.innerHTML = ((peopleFirst ? [people, ...rows] : [...rows, people]).join("") + searchRow("eps", "Episodes", r.episodes, "wide")
          + (!extDone ? `<div class="s-more"><span class="spin small"></span>Looking in your addons</div>` : ""))
          || `<div class="empty"><h2>Nothing found for “${esc(q)}”</h2><p>Check the spelling or try an actor, director or genre.</p></div>`;
        enhanceRows(box);
      };
      draw();
      api("/api/search/addons?q=" + encodeURIComponent(q)).then((x) => { if (my !== seq || !$("#sres")) return; ext = x.external; extDone = true; draw(); })
        .catch(() => { extDone = true; if (my === seq && $("#sres")) draw(); });
    };
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 220); });
    $("#sres").addEventListener("click", async (e) => {
      // View All opens a row up into a grid, and back
      const va = e.target.closest("[data-viewall]");
      if (va) {
        e.preventDefault();
        const sec = va.closest(".srow"), row = $(".row", sec);
        const open = !sec.classList.contains("all");
        if (va.classList.contains("more-card")) { va.remove(); sec.classList.add("all"); row.classList.add("grid"); const h = $(".see-all", sec); if (h) h.textContent = "Show Less"; const f = $(".tile", row); if (f) f.focus(); return; }
        sec.classList.toggle("all", open);
        row.classList.toggle("grid", open);
        va.textContent = open ? "Show Less" : "View All";
        if (!open) sec.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
        return;
      }
      const pa = e.target.closest("[data-play]");
      if (pa) {
        e.preventDefault();
        const tt = await api(`/api/title/${pa.dataset.tid}`);
        return playFile(pa.dataset.play, { title: tt, from: 0 });
      }
      // Anything opened from search goes into this profile's Recently Searched
      const a = e.target.closest("a.tile");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const m = href.match(/^#\/title\/([^/?]+)/), d = href.match(/^#\/discover\/([^/]+)\/([^/?]+)/);
      const name = (a.querySelector(".cap") || {}).textContent || "";
      const body = m ? { title_id: m[1] } : d ? { kind: decodeURIComponent(d[1]), id: decodeURIComponent(d[2]), name, poster: a.dataset.poster || null } : null;
      if (body) api("/api/search/recent", body).catch(() => {});
    });
    run();
  }
  const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

  // Everything in the library with one actor or director
  async function pagePerson(name) {
    const r = await api("/api/person?name=" + encodeURIComponent(name));
    app.innerHTML = topbar("search") + backBtn() + `<main class="page">
      <div class="person-head"><span class="person-big">${ic("person")}</span><div><h1 class="large-title" style="margin:0">${esc(r.name)}</h1>
        <div class="secondary">${r.titles.length} title${r.titles.length === 1 ? "" : "s"} in your library</div></div></div>
      ${r.titles.length ? `<div class="grid">${r.titles.map(posterTile).join("")}</div>` : `<div class="empty"><h2>Nothing with ${esc(r.name)} yet</h2></div>`}</main>`;
    wireTopbar();
  }

  // Before typing: what this profile opened from search lately, or a mix of things to watch if there's nothing yet
  async function drawStart(box) {
    const my = ++START_SEQ;
    box.innerHTML = `<div class="sk sk-line" style="width:200px;margin-top:32px"></div><div class="grid">${Array.from({ length: 12 }, () => '<div class="sk sk-poster"></div>').join("")}</div>`;
    const r = await api("/api/search/start").catch(() => ({ recent: [], explore: [] }));
    if (my !== START_SEQ || !$("#sres") || $("#sq").value.trim()) return;
    box.innerHTML = (r.recent.length ? `<h2 class="section-title search-head">Recently Searched <button id="clearRecent">Clear</button></h2><div class="grid">${r.recent.map(posterTile).join("")}</div>` : "")
      + (r.explore.length ? `<h2 class="section-title search-head">${r.recent.length ? "Something to Watch" : "Explore"}</h2><div class="grid">${r.explore.slice(0, r.recent.length ? 12 : 18).map(posterTile).join("")}</div>` : "")
      || `<div class="empty"><h2>Search Kino</h2><p>Find films and shows by name, actor, genre or episode title.</p></div>`;
    const c = $("#clearRecent");
    if (c) c.onclick = async () => { await api("/api/search/recent", undefined, "DELETE"); drawStart(box); };
  }
  let START_SEQ = 0;

  // Voice search. The android app uses the phone's own voice typing, browsers with speech recognition built in
  // (chrome, edge, safari) use that, and everything else records a few seconds and the server works out the words.
  // If the built in one fails (brave and opera have it but it never works) it quietly switches to the server
  let VOICE_SERVER = false;
  function setupMic(input, onDone) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = $("#micBtn");
    if (!btn) return;
    const put = (text) => {
      if (!text) return;
      input.value = text.replace(/[.?!]$/, "");
      input.dispatchEvent(new Event("input"));
      onDone && onDone();
    };
    if (ANDROID && window.KinoAndroid.hasVoice()) {
      btn.hidden = false;
      window.kinoVoice = put;
      btn.onclick = () => window.KinoAndroid.startVoice();
      return;
    }
    const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    if (!SR && !canRecord) return;
    btn.hidden = false;
    const listening = (on, label) => {
      btn.classList.toggle("listening", on);
      btn.setAttribute("aria-label", on ? "Stop Listening" : "Search by Voice");
      input.placeholder = on ? label || "Listening…" : "Films, shows, actors, directors and more";
    };
    let stop = null;
    btn.onclick = () => {
      if (stop) { stop(); return; }
      if (SR && !VOICE_SERVER) browserVoice(); else recordVoice();
    };

    function browserVoice() {
      const rec = new SR();
      let heard = false, failed = false;
      rec.lang = navigator.language || "en-GB";
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      listening(true);
      stop = () => rec.stop();
      rec.onresult = (e) => {
        heard = true;
        input.value = Array.from(e.results).map((r) => r[0].transcript).join("").replace(/[.?!]$/, "");
        input.dispatchEvent(new Event("input"));
      };
      rec.onerror = (e) => {
        failed = true;
        if (e.error === "not-allowed") return toast("Microphone access is blocked, allow it in your browser settings");
        if (e.error === "no-speech") return toast("Didn't catch that, try again");
        // network, service-not-allowed and language-not-supported mean the browser cant do it, the server takes over
        if (canRecord) { VOICE_SERVER = true; setTimeout(recordVoice, 50); }
        else toast("Voice search isn't working in this browser");
      };
      rec.onend = () => { stop = null; if (!VOICE_SERVER || !failed) listening(false); if (heard && !failed) onDone && onDone(); };
      try { rec.start(); } catch (_) { stop = null; listening(false); if (canRecord) { VOICE_SERVER = true; recordVoice(); } }
    }

    async function recordVoice() {
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (_) { toast("Microphone access is blocked, allow it in your browser settings"); return; }
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
      // Stops by itself once you've said something and gone quiet, or after 8 seconds
      let ctx, timer, spoke = false, quietSince = 0;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const an = ctx.createAnalyser(); an.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Float32Array(an.fftSize);
        timer = setInterval(() => {
          an.getFloatTimeDomainData(buf);
          const rms = Math.sqrt(buf.reduce((a, x) => a + x * x, 0) / buf.length);
          if (rms > 0.025) { spoke = true; quietSince = 0; }
          else if (spoke) { quietSince = quietSince || Date.now(); if (Date.now() - quietSince > 1100) finish(); }
        }, 100);
      } catch (_) {}
      const cap = setTimeout(() => finish(), 8000);
      function finish() { if (rec.state === "recording") rec.stop(); }
      stop = finish;
      rec.onstop = async () => {
        clearInterval(timer); clearTimeout(cap); stop = null;
        stream.getTracks().forEach((t) => t.stop());
        if (ctx) ctx.close().catch(() => {});
        listening(true, "Working it out…");
        try {
          const r = await fetch("/api/voice", { method: "POST", headers: { "X-Kino": "1", "Content-Type": rec.mimeType || "audio/webm" }, body: new Blob(chunks, { type: rec.mimeType || "audio/webm" }), credentials: "same-origin" });
          const j = await r.json().catch(() => ({}));
          listening(false);
          if (!r.ok) return toast(j.detail || "Voice search didn't work, try again");
          if (!j.text) return toast("Didn't catch that, try again");
          put(j.text);
        } catch (_) { listening(false); toast("Voice search didn't work, try again"); }
      };
      rec.start();
      listening(true);
    }
  }

  // ---------------------------------------------------------- title detail
  async function pageTitle(id) {
    const t = await api(`/api/title/${id}`);
    const up = nextUp(t);
    const allBadges = [...new Set(t.files.flatMap((f) => f.badges))];
    const resume = up && up.progress && up.progress.dur && up.progress.pos > 30;
    const playLabel = resume ? `Resume${t.kind === "series" ? " " + epLabel(up.season, up.episode) : ""}` : t.kind === "series" && up ? `Play ${epLabel(up.season, up.episode)}` : "Play";
    const seasons = [...new Set(t.files.map((f) => f.season ?? 0))].sort((a, b) => a - b);
    const curSeason = up ? up.season ?? 0 : seasons[0];
    // Shows up in Continue Watching when something is half watched, or a show is part way through
    const inCont = !!up && (t.files.some((f) => f.progress) || (t.kind === "series" && t.files.some((f) => f.watched) && !t.watched));
    const rateBtn = (v, icon, label) => `<button class="round-btn ${t.my_rating === v ? "on" : ""}" data-rate="${v}" aria-pressed="${t.my_rating === v}" aria-label="${label}" title="${label}">${ic(icon)}</button>`;

    app.innerHTML = topbar(t.kind === "series" ? "shows" : "movies") + backBtn() + `
      <section class="detail-hero">
        <div class="hero-bg ${t.poster ? "has-tall" : ""}">${heroArt(t)}</div>
        <div class="hero-content" style="z-index:2">
          ${t.logo ? `<img class="hero-logo" src="${img(t.logo, 1)}" alt="${esc(t.name)}" data-fallback="text">` : `<h1 class="hero-name">${esc(t.name)}</h1>`}
          <div class="hero-meta">${metaLine(t).map((m, i) => `<span class="${i ? "dot-sep" : ""}">${esc(m)}</span>`).join("")}</div>
          ${allBadges.length ? `<div class="badges" style="margin-bottom:16px">${allBadges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}</div>` : ""}
          ${t.description ? `<p class="hero-desc" style="-webkit-line-clamp:4">${esc(t.description)}</p>` : ""}
          <div class="actions">
            ${up ? `<button class="btn primary" id="playMain">${ic("play")} ${esc(playLabel)}</button>` : ""}
            ${resume ? `<button class="btn secondary" id="playStart">Start Over</button>` : ""}
            ${listBtn(t.in_list)}
            <button class="round-btn ${t.watched ? "on" : ""}" id="watchedBtn" aria-pressed="${t.watched}" aria-label="${t.watched ? "Mark as unwatched" : "Mark as watched"}" title="${t.watched ? "Watched" : "Mark as Watched"}">${ic(t.watched ? "check" : "eye")}</button>
            <span class="rate-group" role="group" aria-label="Rate this">${rateBtn(-1, "down", "Not for me")}${rateBtn(1, "up", "I like this")}${rateBtn(2, "love", "Love this")}</span>
            ${inCont ? `<button class="round-btn" id="contHide" aria-label="Remove from Continue Watching" title="Remove from Continue Watching">${ic("close")}</button>` : ""}
            ${t.kind === "movie" && up ? `<button class="round-btn" id="dlMain" aria-label="Download" title="Download">${ic("download")}</button>` : ""}
            ${t.is_admin ? `<div class="menu-wrap"><button class="round-btn" id="adminMore" aria-haspopup="true" aria-label="Admin options" title="Admin options">${ic("more")}</button>
              <div class="menu drop up-left" id="adminMenu" hidden>
                <button class="mi" id="fixMatch">${ic("wand")} Fix Match</button>
                <button class="mi" id="rescanT">${ic("refresh")} Rescan Library</button>
                <button class="mi" id="kidsT">${ic("kids")} ${t.kids_allowed ? "Hide from Kids" : "Allow for Kids"}</button>
                <button class="mi danger" id="delTitle">${ic("trash")} Delete from Library</button>
              </div></div>` : ""}
          </div>
          ${resume ? `<div class="progress thin" style="max-width:280px;margin-top:16px"><i style="width:${(up.progress.pos / up.progress.dur) * 100}%"></i></div>
            <div class="note">${clock(up.progress.dur - up.progress.pos)} left</div>` : ""}
        </div>
      </section>
      <main class="page under-hero" style="padding-top:12px">
        ${t.kind === "series" ? `<section class="section" style="margin-top:0">
          <div class="seasons">${seasonPick(seasons, curSeason, t.files)}</div>
          <div class="episodes" id="eps"></div>
          ${t.pd_streams ? `<a class="btn secondary small pd-more" href="#/discover/series/${encodeURIComponent(t.imdb)}?all=1">${ic("globe")} More Episodes</a>` : ""}</section>` : ""}
        ${t.kind === "movie" && t.files.length > 1 ? `<section class="section"><h2 class="section-title">Versions</h2><div class="versions">${t.files.map((f) => `
          <div class="v"><div class="grow"><div class="badges">${f.badges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}</div><div class="nm">${esc(f.name)}</div></div>
          <span class="secondary" style="font-size:14px">${bytes(f.size)}</span><button class="btn secondary small" data-playfile="${f.id}">${ic("play")} Play</button>
          ${t.is_admin ? `<button class="round-btn sm" data-delfile="${f.id}" aria-label="Delete this version" title="Delete this version">${ic("trash")}</button>` : ""}</div>`).join("")}</div></section>` : ""}
        ${t.cast?.length ? `<section class="section"><h2 class="section-title">Cast</h2><div class="cast">${t.cast.map((c) => `<a href="#/person/${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}</div></section>` : ""}
        <section class="section"><div class="facts">
          ${t.director ? `<div><h4>Director</h4><p>${[].concat(t.director).map((d) => `<a class="plain-link" href="#/person/${encodeURIComponent(d)}">${esc(d)}</a>`).join(", ")}</p></div>` : ""}
          <div><h4>In Your Library</h4><p>${t.files.length} file${t.files.length === 1 ? "" : "s"}, ${bytes(t.size)}</p></div>
          ${t.genres?.length ? `<div><h4>Genres</h4><p>${esc(t.genres.join(", "))}</p></div>` : ""}
          ${!t.matched ? `<div><h4>Info</h4><p>Couldn't find this title on Cinemeta, so its shown with the file name.${t.is_admin ? " Use Fix match to pick the right one." : ""}</p></div>` : ""}
        </div></section>
      </main>`;
    wireTopbar();
    window.scrollTo(0, 0);

    const drawEps = (season) => {
      const eps = t.files.filter((f) => (f.season ?? 0) === season);
      $("#eps").innerHTML = eps.map((f) => {
        const p = f.progress && f.progress.dur ? f.progress.pos / f.progress.dur : null;
        const art = f.thumbnail ? `<img loading="lazy" src="${img(f.thumbnail)}" alt="${esc(f.ep_name || f.name)}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(t.name)}">${esc(epLabel(f.season, f.episode))}</div>`;
        return `<div class="ep"><button class="tile landscape ${f.watched ? "is-watched" : ""}" data-playfile="${f.id}" aria-label="Play ${esc(epLabel(f.season, f.episode))} ${esc(f.ep_name || "")}"><div class="art">${art}${p != null ? `<div class="bar"><i style="width:${Math.min(100, p * 100)}%"></i></div>` : ""}${f.watched ? `<span class="tile-check">${ic("check")}</span>` : ""}<span class="tile-play">${ic("play")}</span></div></button>
          <div class="ep-row"><div class="num">${esc(epLabel(f.season, f.episode) || "Extra")}${f.duration ? ` · ${Math.max(1, Math.round(f.duration / 60))} min` : ""}</div>
            <button class="ep-mark" data-epwatch="${f.id}" data-state="${f.watched ? 1 : 0}" aria-label="${f.watched ? "Mark as unwatched" : "Mark as watched"}" title="${f.watched ? "Watched, click to unmark" : "Mark as watched"}">${ic(f.watched ? "check" : "plus")}</button>
            ${t.is_admin ? `<button class="ep-mark" data-delfile="${f.id}" aria-label="Delete this episode" title="Delete this episode">${ic("trash")}</button>` : ""}</div>
          <div class="cap">${esc(nice(f.ep_name) || f.name)}</div>${f.ep_overview ? `<div class="ov">${esc(f.ep_overview)}</div>` : ""}</div>`;
      }).join("");
      wireFileButtons();
    };
    const wireFileButtons = () => {
      $$("[data-playfile]").forEach((b) => (b.onclick = () => {
        const f = t.files.find((x) => x.id === b.dataset.playfile);
        playFile(f.id, { title: t, from: f.progress ? f.progress.pos : 0 });
      }));
      $$("[data-epwatch]").forEach((b) => (b.onclick = async () => {
        await api("/api/watched", { file_id: b.dataset.epwatch, watched: b.dataset.state !== "1" });
        route();
      }));
      $$("[data-delfile]").forEach((b) => (b.onclick = async () => {
        const f = t.files.find((x) => x.id === b.dataset.delfile);
        if (!(await confirmSheet("Delete this file?", `${f.name} (${bytes(f.size)}) is removed from the Storage Box for everyone. The sync won't download it again.`, "Delete"))) return;
        try { await api(`/api/admin/file/${f.id}`, undefined, "DELETE"); toast("Deleted"); t.files.length > 1 ? route() : (location.hash = "#/home"); }
        catch (e) { toast(e.message, 5000); }
      }));
    };
    if (t.kind === "series") {
      $("#seasonPick").onchange = (e) => drawEps(Number(e.target.value));
      drawEps(curSeason);
    } else wireFileButtons();

    const pm = $("#playMain");
    if (pm) pm.onclick = () => playFile(up.id, { title: t, from: resume ? up.progress.pos : 0 });
    const ps = $("#playStart");
    if (ps) ps.onclick = () => playFile(up.id, { title: t, from: 0 });
    wireListBtn({ title_id: t.id }, t.list_key);
    const kt = $("#kidsT");
    if (kt) kt.onclick = async () => {
      await api("/api/admin/kids", { key: t.kids_key, allow: !t.kids_allowed });
      toast(t.kids_allowed ? "Hidden from kids profiles" : "Allowed on kids profiles"); route();
    };
    $("#watchedBtn").onclick = async () => { await api("/api/watched", { title_id: t.id, watched: !t.watched }); toast(t.watched ? "Marked as unwatched" : "Marked as watched"); route(); };
    $$("[data-rate]").forEach((b) => (b.onclick = async () => {
      const v = Number(b.dataset.rate);
      const nv = t.my_rating === v ? 0 : v;
      await api("/api/rate", { title_id: t.id, value: nv });
      t.my_rating = nv;
      $$("[data-rate]").forEach((x) => { const on = Number(x.dataset.rate) === nv; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
      toast(nv === 2 ? "Glad you love it, more like this coming up" : nv === 1 ? "Thanks, we'll show more like this" : nv === -1 ? "Got it, we'll show less like this" : "Rating removed");
    }));
    const dl = $("#dlMain");
    if (dl) dl.onclick = async () => {
      const info = await api(`/api/file/${up.id}`);
      const a = document.createElement("a");
      a.href = info.download + "&save=1";
      a.click();
      toast("Download started");
    };
    const ch = $("#contHide");
    if (ch) ch.onclick = async () => {
      await api("/api/continue/hide", { file_id: up.id }).catch(() => {});
      ch.remove();
      toast("Removed from Continue Watching");
    };
    const am = $("#adminMore");
    if (am) {
      // The hero gets lifted above the episodes while the menu is open, otherwise the season row paints over it
      const menu = $("#adminMenu"), hero = $(".detail-hero");
      const setM = (on) => { menu.hidden = !on; hero.classList.toggle("menu-open", on); am.setAttribute("aria-expanded", on); };
      am.onclick = (e) => { e.stopPropagation(); setM(menu.hidden); };
      const off = (e) => {
        if (!document.body.contains(menu)) { document.removeEventListener("click", off); document.removeEventListener("keydown", esc2); return; }
        if (!menu.hidden && !e.target.closest("#adminMenu")) setM(false);
      };
      const esc2 = (e) => { if (e.key === "Escape" && !menu.hidden) { setM(false); am.focus(); } };
      document.addEventListener("click", off);
      document.addEventListener("keydown", esc2);
      $("#fixMatch").onclick = () => fixMatch(t);
      $("#rescanT").onclick = async () => { await api("/api/admin/rescan", {}); toast("Rescanning the library"); };
      $("#delTitle").onclick = async () => {
        if (!(await confirmSheet(`Delete ${t.name}?`, `All ${t.files.length} file${t.files.length === 1 ? "" : "s"} (${bytes(t.size)}) are removed from the Storage Box for everyone. The sync won't download them again.`, "Delete"))) return;
        try { const r = await api(`/api/admin/title/${t.id}`, undefined, "DELETE"); toast(`Deleted, ${bytes(r.freed)} freed`); location.hash = "#/home"; }
        catch (e) { toast(e.message, 5000); }
      };
    }
  }

  // A title from an addon catalog, Kino can show what it is but only plays whats in the library
  async function pageDiscover(kind, id) {
    const nm = EXT_NAME.get(`${kind}/${id}`) || "";
    const q = [location.hash.includes("?all=1") ? "stay=1" : "", nm ? "name=" + encodeURIComponent(nm) : ""].filter(Boolean).join("&");
    const t = await api(`/api/external/${encodeURIComponent(kind)}/${encodeURIComponent(id)}${q ? "?" + q : ""}`);
    if (t.library_id) { location.replace(`#/title/${t.library_id}`); return; }
    const facts = metaLine({ ...t, kind });
    app.innerHTML = topbar(kind === "series" ? "shows" : "movies") + backBtn() + `
      <section class="detail-hero">
        <div class="hero-bg ${t.poster ? "has-tall" : ""}">${heroArt(t)}</div>
        <div class="hero-content" style="z-index:2">
          ${t.logo ? `<img class="hero-logo" src="${img(t.logo, 1)}" alt="${esc(t.name)}" data-fallback="text">` : `<h1 class="hero-name">${esc(t.name)}</h1>`}
          <div class="hero-meta">${facts.map((m, i) => `<span class="${i ? "dot-sep" : ""}">${esc(m)}</span>`).join("")}</div>
          ${t.description ? `<p class="hero-desc" style="-webkit-line-clamp:4">${esc(t.description)}</p>` : ""}
          <div id="pdBox" aria-busy="true"><span class="sr">Looking for a copy to play</span><div class="actions pd-skel" aria-hidden="true"><span class="sk sk-btn"></span><span class="sk sk-btn short"></span><span class="sk sk-round"></span><span class="sk sk-round"></span></div><div class="sk sk-line pd-skel-line" aria-hidden="true"></div></div>
        </div>
      </section>
      <main class="page under-hero" style="padding-top:12px">
        ${t.videos?.length ? `<section class="section" style="margin-top:0">
          <div class="seasons" id="extSeasons"></div>
          <div class="episodes" id="eps"></div></section>` : ""}
        ${t.cast?.length ? `<section class="section"><h2 class="section-title">Cast</h2><div class="cast">${t.cast.map((c) => `<a href="#/person/${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}</div></section>` : ""}
        <section class="section"><div class="facts">
          ${t.director ? `<div><h4>Director</h4><p>${[].concat(t.director).map((d) => `<a class="plain-link" href="#/person/${encodeURIComponent(d)}">${esc(d)}</a>`).join(", ")}</p></div>` : ""}
          ${t.genres?.length ? `<div><h4>Genres</h4><p>${esc(t.genres.join(", "))}</p></div>` : ""}
          ${kind === "series" && t.seasons ? `<div><h4>Seasons</h4><p>${t.seasons} season${t.seasons === 1 ? "" : "s"}, ${t.episodes} episodes</p></div>` : ""}
        </div></section>
      </main>`;
    wireTopbar();
    if (!t.videos?.length) return drawStreams(kind, id, t);
    // Carries on where the profile left off, otherwise the first episode
    const started = t.videos.filter((v) => v.progress).sort((a, b) => b.progress.updated - a.progress.updated)[0];
    let target = t.videos[0];
    if (started) {
      const i = t.videos.indexOf(started);
      target = started.progress.watched || (started.progress.dur && started.progress.pos / started.progress.dur > 0.93) ? t.videos[i + 1] || started : started;
    }
    const drawEps = (season) => {
      $("#eps").innerHTML = t.videos.filter((v) => v.season === season).map((v) => {
        const pr = v.progress && v.progress.dur ? v.progress.pos / v.progress.dur : null;
        const art = v.thumbnail ? `<img loading="lazy" src="${img(v.thumbnail)}" alt="${esc(v.name || "")}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(t.name)}">${esc(epLabel(v.season, v.episode))}</div>`;
        return `<div class="ep"><button class="tile landscape ${v.progress && v.progress.watched ? "is-watched" : ""}" data-playep="${esc(v.id)}" aria-label="Play ${esc(epLabel(v.season, v.episode))} ${esc(v.name || "")}"><div class="art">${art}${pr != null ? `<div class="bar"><i style="width:${Math.min(100, pr * 100)}%"></i></div>` : ""}${v.progress && v.progress.watched ? `<span class="tile-check">${ic("check")}</span>` : ""}<span class="tile-play">${ic("play")}</span></div></button>
          <div class="ep-row"><div class="num">${esc(epLabel(v.season, v.episode))}</div>
            ${isAdmin() ? `<button class="ep-mark" data-saveep="${esc(v.id)}" aria-label="Save to Library" title="Save to Library">${ic("download")}</button>` : ""}</div>
          <div class="cap">${esc(nice(v.name) || epLabel(v.season, v.episode))}</div>${v.overview ? `<div class="ov">${esc(v.overview)}</div>` : ""}</div>`;
      }).join("");
      $$("[data-playep]").forEach((b) => (b.onclick = () => playEpisode(b.dataset.playep, t.videos.find((v) => v.id === b.dataset.playep))));
      $$("[data-saveep]").forEach((b) => (b.onclick = () => saveEpisode(b.dataset.saveep, t)));
    };
    $("#extSeasons").innerHTML = seasonPick(t.season_list, target.season, t.videos);
    $("#seasonPick").onchange = (e) => drawEps(Number(e.target.value));
    drawEps(target.season);
    drawStreams(kind, target.id, t, target);
  }

  // Finds the public domain copy of one episode and plays it
  async function playEpisode(vid, v) {
    let r;
    try { r = await api(`/api/streams/series/${encodeURIComponent(vid)}`); } catch (e) { toast(e.message, 5000); return false; }
    if (!r.streams.length) { toast("There's no public domain copy of this episode"); return false; }
    const s = r.streams[0];
    playFile(s.id, { from: s.progress && !s.progress.watched ? s.progress.pos : 0 });
    return true;
  }

  async function saveEpisode(vid, t) {
    const r = await api(`/api/streams/series/${encodeURIComponent(vid)}`).catch(() => ({ streams: [] }));
    if (!r.streams.length) { toast("There's no public domain copy of this episode"); return; }
    try { await api(`/api/admin/streams/${r.streams[0].id}/save`, {}); toast(`Saving to the Library`); watchSave(r.streams[0].id, true); }
    catch (e) { toast(e.message, 5000); }
  }

  // Public domain copies from addons, the server only hands back ones that are actually on archive.org
  async function drawStreams(kind, id, t, ep) {
    const box = $("#pdBox");
    const none = `<div class="not-lib glass" style="margin-top:14px">${ic("info")}<span>Not in Your Library</span></div>`;
    let r;
    try { r = await api(`/api/streams/${kind}/${encodeURIComponent(id)}`); } catch (_) { r = { streams: [] }; }
    if (!$("#pdBox")) return;
    const lb = listBtn(t.in_list);
    if (!r.streams.length) {
      // Admins get told why nothing can play, so a missing addon or a slow archive.org is easy to spot
      let why = "";
      if (isAdmin() && r.report) {
        if (!r.report.length) why = r.stream_addons && r.stream_addons.length ? `None of your stream addons (${r.stream_addons.join(", ")}) handle this title.` : "No addon with streams is installed. Install the Archive.org addon to play public domain films.";
        else why = r.report.map((x) => x.error ? `${x.addon} ${x.error}.` : !x.found ? `${x.addon} found nothing for this title.`
          : `${x.addon} found ${x.found}, but none could be used${x.other.length ? ` (${x.other.join(", ")})` : ""}.`).join(" ");
      }
      box.innerHTML = `<div class="actions">${lb}</div>` + none + (why ? `<div class="note pd-note">${ic("info")} ${esc(why)}</div>` : "");
      wireListBtn({ kind, id: t.list_key }, t.list_key);
      return;
    }
    const first = r.streams[0];
    const res = first.progress && !first.progress.watched && first.progress.pos > 30 ? first.progress : null;
    box.innerHTML = `<div class="actions">
        <button class="btn primary" id="pdPlay">${ic("play")} ${res ? "Resume" : "Play"}${ep ? " " + esc(epLabel(ep.season, ep.episode)) : ""}</button>
        ${r.streams.length > 1 ? `<button class="btn secondary" id="pdMore">${r.streams.length} Sources</button>` : ""}
        ${lb}
        ${isAdmin() ? `<button class="round-btn" id="pdSave" aria-label="Save to Library" title="Save to Library">${ic("download")}</button>` : ""}
      </div>
      ${res ? `<div class="progress thin" style="max-width:280px;margin-top:16px"><i style="width:${(res.pos / res.dur) * 100}%"></i></div><div class="note">${clock(res.dur - res.pos)} left</div>` : ""}`;
    const play = (s) => playFile(s.id, { from: s.progress && !s.progress.watched ? s.progress.pos : 0 });
    $("#pdPlay").onclick = () => play(first);
    wireListBtn({ kind, id: t.list_key }, t.list_key);
    const more = $("#pdMore");
    if (more) more.onclick = () => {
      const sh = sheet(`<div class="src-head"><div><h2>Sources</h2><p class="secondary">${esc(t.name)}${ep ? ` · ${esc(epLabel(ep.season, ep.episode))}` : ""}</p></div>
          <button class="round-btn sm" data-close aria-label="Close">${ic("close")}</button></div>
        <div class="src-list">${r.streams.map((s, i) => {
          const p = s.progress && !s.progress.watched && s.progress.dur ? s.progress.pos / s.progress.dur : 0;
          const meta = [s.format, s.bytes ? bytes(s.bytes) : "", s.addon].filter(Boolean);
          return `<button class="src ${i === 0 ? "best" : ""}" data-src="${i}">
            <span class="src-q ${s.height >= 720 ? "hd" : ""}">${esc(s.quality)}</span>
            <span class="src-body"><b>${esc(nice(s.label))}</b>
              <span class="src-meta">${meta.map((m) => `<span>${esc(m)}</span>`).join("")}</span>
              ${!s.plays ? `<span class="src-warn">${ic("info")} Might not play in this browser, saving it to the Library always works</span>` : ""}
              ${p > 0.02 ? `<span class="src-prog"><i style="width:${p * 100}%"></i></span>` : ""}</span>
            ${i === 0 ? `<span class="src-tag">Best</span>` : ""}
            <span class="src-play">${ic("play")}</span></button>`;
        }).join("")}</div>`, { wide: true });
      $$("[data-src]", sh.el).forEach((b) => (b.onclick = () => { sh.close(); play(r.streams[Number(b.dataset.src)]); }));
    };
    const save = $("#pdSave");
    if (save) save.onclick = async () => {
      if (!(await confirmSheet(`Save ${t.name}${ep ? " " + epLabel(ep.season, ep.episode) : ""} to the Library?`, "Kino downloads this copy to the Storage Box, so it plays like everything else. Big films can take a while.", "Save to Library", false))) return;
      try { await api(`/api/admin/streams/${first.id}/save`, {}); toast("Saving to the Library, you can keep browsing"); watchSave(first.id, !!ep); }
      catch (e) { toast(e.message, 5000); }
    };
  }

  function watchSave(sid, stay) {
    const t = setInterval(async () => {
      let s;
      try { s = await api(`/api/admin/streams/${sid}/save`); } catch (_) { clearInterval(t); return; }
      if (s.state === "done") { clearInterval(t); toast("Saved to the Library"); if (s.title_id && !stay && location.hash.startsWith("#/discover/")) location.hash = `#/title/${s.title_id}`; }
      else if (s.state === "failed") { clearInterval(t); toast(`Saving failed: ${s.error || "unknown error"}`, 6000); }
    }, 4000);
  }

  // Fix match: search cinemeta and pick the right title, it sticks even after rescans
  function fixMatch(t) {
    const s = sheet(`<h2>Fix Match</h2><p class="secondary">The file is named <b>${esc(t.guess_name)}</b>. Search for the right film or show. Installed addons with search are included too.</p>
      <div class="toolbar" style="margin:14px 0">
        <label class="search grow">${ic("search")}<input id="fmq" value="${esc(t.guess_name)}" placeholder="Title"></label>
        <select class="plain" id="fmk"><option value="movie" ${t.kind === "movie" ? "selected" : ""}>Movie</option><option value="series" ${t.kind === "series" ? "selected" : ""}>TV Show</option></select>
        <button class="btn secondary small" id="fmGo">Search</button>
      </div>
      <div class="fm-results" id="fmr"></div>
      <div class="actions end"><button class="btn secondary small" data-close>Close</button></div>`, { wide: true });
    const go = async () => {
      const box = $("#fmr", s.el);
      box.innerHTML = `<div class="secondary">Searching…</div>`;
      try {
        const r = await api(`/api/admin/match/search?kind=${$("#fmk", s.el).value}&q=${encodeURIComponent($("#fmq", s.el).value)}`);
        box.innerHTML = r.results.length ? r.results.map((m) => `<button class="fm-item" data-id="${m.id}" data-kind="${m.kind}">
          <span class="fm-post">${m.poster ? `<img src="${img(m.poster)}" alt="" data-fallback="hide">` : ""}</span>
          <span class="grow"><b>${esc(m.name)}</b><span class="secondary">${esc([m.releaseInfo, m.source].filter(Boolean).join(" · "))}</span></span>${m.id === t.imdb ? `<span class="badge">Current</span>` : ""}</button>`).join("")
          : `<div class="secondary">No results, try a different spelling or switch Movie and TV Show.</div>`;
        $$(".fm-item", box).forEach((b) => (b.onclick = async () => {
          b.disabled = true;
          try { await api("/api/admin/match", { title_id: t.id, imdb_id: b.dataset.id, kind: b.dataset.kind }); s.close(); toast("Match updated"); route(); }
          catch (e) { toast(e.message, 5000); b.disabled = false; }
        }));
      } catch (e) { box.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; }
    };
    $("#fmGo", s.el).onclick = go;
    $("#fmq", s.el).addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    go();
  }

  // ---------------------------------------------------------- settings
  const LANG_OPTS = ["English", "German", "French", "Spanish", "Italian", "Dutch", "Polish", "Portuguese", "Russian", "Japanese", "Korean", "Chinese", "Swedish", "Danish", "Norwegian", "Finnish", "Turkish", "Arabic", "Hindi"];

  async function pageSettings() {
    const me = await api("/api/me");
    ME.profile = me.profile; ME.admin = me.admin; ME.ip = me.ip;
    const p = ME.profile, pr = p.prefs;
    const sel = (id, opts, val) => `<select class="plain" id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    const toggle = (id, on, label, hint) => `<label class="set-row"><span><b>${label}</b>${hint ? `<span class="secondary">${hint}</span>` : ""}</span><input type="checkbox" class="switch" id="${id}" ${on ? "checked" : ""}></label>`;

    app.innerHTML = topbar("settings") + `<main class="page narrow settings">
      <h1 class="large-title">Settings</h1>
      <section class="card set-card">
        <h2 class="set-title">Profile</h2>
        <div class="set-profile">${avatar(p.icon, "lg")}<div class="grow"><div class="set-name">${esc(p.name)}</div><div class="secondary">Everyone on this profile shares the watch history and these settings.</div></div>
          <button class="btn secondary small" id="editMe">${ic("pencil")} Edit</button></div>
        <div class="set-row"><span><b>Profile Lock</b><span class="secondary">${p.locked ? "A 4 digit code is needed to open this profile" : "Ask for a 4 digit code when someone picks this profile"}</span></span>
          <span class="actions">${p.locked ? `<button class="btn secondary small" id="pinChange">Change Code</button><button class="btn secondary small" id="pinOff">Remove</button>` : `<button class="btn secondary small" id="pinSet">${ic("lock")} Set Code</button>`}</span></div>
      </section>
      <section class="card set-card">
        <h2 class="set-title">Appearance</h2>
        <div class="set-row"><span><b>Theme</b><span class="secondary">Automatic follows this device's light or dark setting</span></span>${themePicker("setTheme")}</div>
      </section>
      <section class="card set-card">
        <h2 class="set-title">Android App</h2>
        ${ANDROID ? `<div class="set-row"><span><b>Kino for Android ${esc(window.KinoAndroid.version())}</b><span class="secondary">You're using the app${TV ? " on a TV" : ""}. Get updates from the same link below.</span></span></div>` : ""}
        ${nativeOk() ? `<label class="set-row"><span><b>App Player</b><span class="secondary">Plays videos with the device's own player, smoother and fixes broken colours on some TVs. Turn off to use the web player on this device</span></span><input type="checkbox" class="switch" id="pNative" ${useNative() ? "checked" : ""}></label>` : ""}
        <div class="set-row"><span><b>Phones, Tablets and Android TV</b><span class="secondary">Full screen player, picture in picture, voice search and TV remote support</span></span>
          <a class="btn secondary small" href="/app" download>${ic("download")} Download</a></div>
        <div class="set-row"><span><b>Fire TV</b><span class="secondary">Install the free Downloader app, then type <b class="mono">${esc(location.host)}/app</b> into it</span></span></div>
      </section>
      <section class="card set-card">
        <h2 class="set-title">Playback</h2>
        <div class="set-row"><span><b>Audio Language</b><span class="secondary">Picked automatically when a film has more than one</span></span>${sel("pAudioL", [["", "Original"], ...LANG_OPTS.map((l) => [l, l])], pr.audio_lang)}</div>
        <div class="set-row"><span><b>Subtitles</b><span class="secondary">Turned on automatically when the language is there</span></span>${sel("pSubL", [["", "Off"], ...LANG_OPTS.map((l) => [l, l])], pr.sub_lang)}</div>
        <div class="set-row"><span><b>Subtitle Size</b></span>${sel("pSubS", [["s", "Small"], ["m", "Medium"], ["l", "Large"]], pr.sub_size)}</div>
        ${toggle("pAuto", pr.autoplay, "Autoplay Next Episode", "Starts the next episode after a short countdown")}
        ${toggle("pSkip", pr.skip_intro, "Skip Intros Automatically", "Only works where Kino knows the intro")}
        <div class="set-row"><span><b>Are You Still Watching?</b><span class="secondary">Pauses and asks after this long with nobody touching anything</span></span>${sel("pStill", [["0", "Never"], ["30", "30 Minutes"], ["60", "1 Hour"], ["90", "1.5 Hours"], ["120", "2 Hours"], ["180", "3 Hours"], ["240", "4 Hours"]], String(pr.still_watching || 0))}</div>
        ${toggle("pLoadStats", pr.load_stats !== false, "Loading Details", "Shows what Kino is doing while a video starts, like the speed and audio track")}
        ${toggle("pBlur", pr.blur_watched, "Blur Watched", "Blurs the artwork of films and episodes you've already watched")}
        ${toggle("pShare", pr.share_events, "Share Watch Activity with Addons", "Lets tracking addons like Trakt see what this profile watches")}
        <div class="actions end"><span class="secondary" id="prefSaved"></span></div>
      </section>
      ${isAdmin() ? `<div id="adminSettings"><div class="card skel" style="height:160px"></div></div>` : `
      <section class="card set-card"><h2 class="set-title">Admin</h2><div class="set-row"><span><b>Admin Tools</b><span class="secondary">Profiles, allowed networks, addons, sync and server</span></span><button class="btn secondary small" id="setAdminIn">${ic("lock")} Sign In</button></div></section>`}
    </main>`;
    wireTopbar();
    $("#editMe").onclick = () => editProfile(p, () => route());
    const setPin = async (remove) => {
      let old = "";
      if (p.locked) {
        old = await pinPad("Enter the Current Code", async (c) => c);
        if (!old) return;
      }
      let code = "";
      if (!remove) {
        code = await pinPad("Choose a 4 Digit Code", async (c) => c, "You'll need it every time you open this profile");
        if (!code) return;
        const again = await pinPad("Enter It Again", async (c) => { if (c !== code) throw new Error("Those codes don't match"); return c; });
        if (!again) return;
      }
      try { const r = await api("/api/profile/pin", { old, pin: code }); ME.profile = r.profile; toast(remove ? "Lock removed" : "Profile locked"); route(); }
      catch (e) { toast(e.message, 5000); }
    };
    const ps = $("#pinSet"), pc = $("#pinChange"), po = $("#pinOff");
    if (ps) ps.onclick = () => setPin(false);
    if (pc) pc.onclick = () => setPin(false);
    if (po) po.onclick = () => setPin(true);
    wireThemePicker($("#setTheme"));
    const saveP = async () => {
      const prefs = { audio_lang: $("#pAudioL").value, sub_lang: $("#pSubL").value, sub_size: $("#pSubS").value, autoplay: $("#pAuto").checked, skip_intro: $("#pSkip").checked, share_events: $("#pShare").checked, blur_watched: $("#pBlur").checked, still_watching: Number($("#pStill").value), load_stats: $("#pLoadStats").checked };
      const r = await api("/api/profile", { prefs }, "PUT");
      ME.profile = r.profile;
      applyPrefs();
      $("#prefSaved").textContent = "Saved";
      setTimeout(() => $("#prefSaved") && ($("#prefSaved").textContent = ""), 1800);
    };
    ["pAudioL", "pSubL", "pSubS", "pAuto", "pSkip", "pBlur", "pShare", "pStill", "pLoadStats"].forEach((id) => $("#" + id).addEventListener("change", saveP));
    const si = $("#setAdminIn"); if (si) si.onclick = () => adminLogin(() => route());
    const nv = $("#pNative"); if (nv) nv.onchange = () => { try { localStorage.setItem(NATIVE_KEY, nv.checked ? "1" : "0"); } catch (_) {} toast(nv.checked ? "Videos play in the app player" : "Videos play in the web player"); };
    if (isAdmin()) drawAdminSettings();
  }

  async function drawAdminSettings() {
    const [pr, al] = await Promise.all([api("/api/profiles"), api("/api/admin/allowlist")]);
    const box = $("#adminSettings");
    if (!box) return;
    const mine = al.your_ip;
    const applied = al.applied;
    box.innerHTML = `
      <section class="card set-card">
        <h2 class="set-title">Profiles</h2>
        ${pr.pending && pr.pending.length ? `<h3 class="sr-sub">Asked For</h3><div class="list">${pr.pending.map((p) => `<div class="li">${avatar(p.icon, "xs")}<span class="grow">${esc(p.name)}</span>
          <button class="btn primary small" data-papprove="${p.id}">Approve</button><button class="btn secondary small" data-pdeny="${p.id}">Deny</button></div>`).join("")}</div><h3 class="sr-sub">Profiles</h3>` : ""}
        <div class="list">${pr.profiles.map((p) => `<div class="li">${avatar(p.icon, "xs")}<span class="grow">${esc(p.name)}${p.locked ? ` <span class="badge">${ic("lock")} Locked</span>` : ""}</span>
          ${p.locked ? `<button class="btn secondary small" data-unlock="${p.id}" title="Takes the code off, you never see what it was">Remove Lock</button>` : ""}
          <button class="btn secondary small" data-editp="${p.id}">${ic("pencil")} Edit</button></div>`).join("")}</div>
        <div class="actions end"><button class="btn secondary small" id="addP">${ic("plus")} Add Profile</button></div>
      </section>
      <section class="card set-card">
        <h2 class="set-title">Allowed Networks</h2>
        <p class="secondary set-hint">Only these internet addresses can open Kino. Add the home IP of each family member. Changes apply within a few seconds.</p>
        <div class="list">${al.entries.map((e) => `<div class="li"><span class="grow"><b>${esc(e.label)}</b> <span class="secondary mono">${esc(e.cidr)}</span></span>
          <span class="r">${e.added ? ago(e.added) : ""}</span><button class="round-btn sm" data-rmip="${esc(e.cidr)}" aria-label="Remove ${esc(e.label)}" title="Remove">${ic("trash")}</button></div>`).join("")}</div>
        <form class="ip-form" id="ipForm">
          <input id="ipLabel" placeholder="Name, like Mum's house" maxlength="40" required>
          <input id="ipCidr" placeholder="IP address, like 84.150.12.34" required spellcheck="false" autocapitalize="none">
          <button class="btn primary small" type="submit">${ic("plus")} Add</button>
        </form>
        <div class="note">Your current address is <b class="mono">${esc(mine)}</b>. <button class="linkish" id="fillMine">Use This Address</button>
          ${applied ? `<span class="${applied.ok ? "" : "err-note"}"> · nginx ${applied.ok ? `updated ${ago(applied.applied_at)}` : `not updated: ${esc(applied.error || "unknown error")}`}</span>` : ""}</div>
        <div class="form-err" id="ipErr" role="alert"></div>
      </section>
      <section class="card set-card" id="devicesCard"><div class="skel" style="height:80px"></div></section>
      <section class="card set-card" id="addonsCard"><div class="skel" style="height:80px"></div></section>`;
    drawDevices();
    drawAddons();
    $$("[data-editp]", box).forEach((b) => (b.onclick = () => editProfile(pr.profiles.find((x) => x.id === Number(b.dataset.editp)), () => drawAdminSettings())));
    $$("[data-papprove]", box).forEach((b) => (b.onclick = async () => { await api(`/api/admin/profiles/${b.dataset.papprove}/approve`, {}); toast("Profile approved"); drawAdminSettings(); }));
    $$("[data-pdeny]", box).forEach((b) => (b.onclick = async () => { await api(`/api/admin/profiles/${b.dataset.pdeny}`, undefined, "DELETE"); toast("Request removed"); drawAdminSettings(); }));
    $$("[data-unlock]", box).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet("Remove this lock?", "Anyone can open the profile again until they set a new code. You never get to see the old code.", "Remove Lock"))) return;
      await api(`/api/admin/profiles/${b.dataset.unlock}/pin-reset`, {}); toast("Lock removed"); drawAdminSettings();
    }));
    $("#addP").onclick = () => editProfile(null, () => drawAdminSettings());
    $("#fillMine").onclick = () => { $("#ipCidr").value = mine; $("#ipLabel").focus(); };
    $("#ipForm").onsubmit = async (e) => {
      e.preventDefault();
      try { await api("/api/admin/allowlist", { cidr: $("#ipCidr").value, label: $("#ipLabel").value }); toast("Network added"); drawAdminSettings(); }
      catch (er) { $("#ipErr").textContent = er.message; }
    };
    $$("[data-rmip]", box).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet("Remove this network?", `${b.dataset.rmip} won't be able to open Kino anymore.`, "Remove"))) return;
      try { await api("/api/admin/allowlist?cidr=" + encodeURIComponent(b.dataset.rmip), undefined, "DELETE"); toast("Network removed"); drawAdminSettings(); }
      catch (er) { $("#ipErr").textContent = er.message; }
    }));
  }

  // Allowed devices: works from any network once approved. Each browser or installed app has its own id
  async function drawDevices() {
    const box = $("#devicesCard");
    if (!box) return;
    let r;
    try { r = await api("/api/admin/devices"); } catch (e) { box.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; return; }
    const kind = (ua) => /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /CrKey|TV|Tizen|Web0S/.test(ua) ? "TV" : "Browser";
    const pending = r.devices.filter((d) => d.status === "pending"), allowed = r.devices.filter((d) => d.status === "allowed");
    const row = (d) => `<div class="li dev"><span class="dev-code mono">${esc(d.code)}</span>
      <span class="grow"><b>${esc(d.name || "Unnamed device")}</b>${d.this ? ` <span class="badge">This Device</span>` : ""}<span class="secondary">${esc(kind(d.ua || ""))} · ${d.status === "pending" ? `asked ${ago(d.created)}` : `last used ${ago(d.last_seen)}`}${d.ip ? ` · ${esc(d.ip)}` : ""}</span></span>
      ${d.status === "pending" ? `<button class="btn primary small" data-dev-ok="${d.id}">Allow</button><button class="btn secondary small" data-dev-no="${d.id}">Deny</button>`
        : `<button class="round-btn sm" data-dev-rm="${d.id}" aria-label="Remove ${esc(d.name)}" title="Remove">${ic("trash")}</button>`}</div>`;
    box.innerHTML = `
      <h2 class="set-title">Allowed Devices</h2>
      <p class="secondary set-hint">A device on this list can open Kino from any network, like a phone on mobile data or a laptop on holiday. Open Kino on the device, tap Ask for Access, then allow it here or type the code it shows.</p>
      ${pending.length ? `<h3 class="sr-sub">Waiting for You</h3><div class="list">${pending.map(row).join("")}</div>` : ""}
      ${allowed.length ? `<h3 class="sr-sub">Allowed</h3><div class="list">${allowed.map(row).join("")}</div>` : `<p class="secondary sr-empty">No devices yet, networks are the only way in right now.</p>`}
      <form class="ip-form" id="devForm">
        <input id="devCode" placeholder="Code, like K7F-29Q" maxlength="8" required spellcheck="false" autocapitalize="characters" class="mono">
        <input id="devName" placeholder="Name, like Mum's iPad" maxlength="40">
        <button class="btn primary small" type="submit">${ic("plus")} Allow</button>
      </form>
      <div class="note">This device's code is <b class="mono">${esc(r.this_code || "unknown")}</b>${r.this_allowed ? ", it's already allowed." : `. <button class="linkish" id="devThis">Allow This Device</button>`}</div>
      <div class="form-err" id="devErr" role="alert"></div>`;
    $("#devForm").onsubmit = async (e) => {
      e.preventDefault();
      try { await api("/api/admin/devices", { code: $("#devCode").value, name: $("#devName").value }); toast("Device allowed"); drawDevices(); }
      catch (er) { $("#devErr").textContent = er.message; }
    };
    const dt = $("#devThis"); if (dt) dt.onclick = async () => { await api("/api/admin/devices", { this: true, name: "" }); toast("This device is allowed"); drawDevices(); };
    $$("[data-dev-ok]", box).forEach((b) => (b.onclick = async () => { await api(`/api/admin/devices/${b.dataset.devOk}`, { status: "allowed" }, "PUT"); toast("Device allowed"); drawDevices(); }));
    $$("[data-dev-no]", box).forEach((b) => (b.onclick = async () => { await api(`/api/admin/devices/${b.dataset.devNo}`, { status: "denied" }, "PUT"); drawDevices(); }));
    $$("[data-dev-rm]", box).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet("Remove this device?", "It won't be able to open Kino anymore unless it's on an allowed network.", "Remove"))) return;
      try { await api(`/api/admin/devices/${b.dataset.devRm}`, undefined, "DELETE"); toast("Device removed"); drawDevices(); } catch (er) { toast(er.message, 5000); }
    }));
  }

  // Stremio addons, installed by pasting the manifest link like in stremio itself
  async function drawAddons() {
    const box = $("#addonsCard");
    if (!box) return;
    let r;
    try { r = await api("/api/admin/addons"); } catch (e) { box.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; return; }
    const uses = (u) => [u.catalogs && "Catalogs", u.meta && "Metadata", u.subtitles && "Subtitles", u.events && "Watch Activity"].filter(Boolean);
    box.innerHTML = `
      <h2 class="set-title">Addons</h2>
      <p class="secondary set-hint">Paste the link to any Stremio addon, it ends with manifest.json. Kino uses their catalogs on Home and in Search, their metadata for matching, their subtitles in the player and their watch activity tracking.</p>
      <div class="list">${r.addons.map((a) => `<div class="addon ${a.enabled ? "" : "off"}">
        <div class="addon-top">
          <span class="addon-logo">${a.logo ? `<img src="${img(a.logo)}" alt="" data-fallback="hide">` : ic("puzzle")}</span>
          <span class="grow"><b>${esc(a.name)}</b> <span class="secondary">${esc(a.version ? "v" + a.version : "")}</span>
            ${a.description ? `<span class="addon-desc secondary">${esc(a.description)}</span>` : ""}</span>
          <input type="checkbox" class="switch" data-aon="${a.id}" ${a.enabled ? "checked" : ""} aria-label="Turn ${esc(a.name)} on or off">
        </div>
        <div class="addon-tags">${uses(a.uses).map((u) => `<span class="badge">${u}</span>`).join("")}${a.uses.streams ? `<span class="badge">Streams</span>` : ""}
          ${a.config_required ? `<span class="badge warn">Needs Setting Up</span>` : ""}</div>
        ${a.config_required ? `<div class="note">This addon has to be set up on its own website first. Paste the link it gives you after setting it up.</div>` : ""}
        <div class="addon-foot">
        ${a.catalogs.filter((c) => c.home).length ? `<details class="addon-cats"><summary>Home Shelves</summary>${a.catalogs.filter((c) => c.home).map((c) => `
          <label class="set-row"><span><b>${esc(c.name)}</b><span class="secondary">${c.type === "series" ? "TV Shows" : c.type === "movie" ? "Movies" : esc(c.type)}</span></span>
          <input type="checkbox" class="switch" data-cat="${a.id}" data-key="${esc(c.key)}" ${c.shown ? "checked" : ""}></label>`).join("")}</details>` : "<span></span>"}
        <div class="actions end"><button class="btn secondary small" data-aref="${a.id}">${ic("refresh")} Refresh</button>
          <button class="btn danger small" data-arm="${a.id}">${ic("trash")} Remove</button></div></div>
      </div>`).join("") || `<div class="secondary" style="padding:8px 0">No addons installed yet.</div>`}</div>
      <form class="ip-form addon-form" id="addonForm">
        <input id="addonUrl" placeholder="https://example.com/manifest.json" required spellcheck="false" autocapitalize="none" inputmode="url">
        <button class="btn primary small" type="submit" id="addonGo">${ic("plus")} Install</button>
      </form>
      <div class="form-err" id="addonErr" role="alert"></div>`;
    $("#addonForm").onsubmit = async (e) => {
      e.preventDefault();
      const b = $("#addonGo"); b.disabled = true; $("#addonErr").textContent = "";
      try { const x = await api("/api/admin/addons", { url: $("#addonUrl").value }); toast(`${x.name || "Addon"} installed`); drawAddons(); }
      catch (er) { $("#addonErr").textContent = er.message; b.disabled = false; }
    };
    $$("[data-aon]", box).forEach((c) => (c.onchange = async () => {
      try { await api(`/api/admin/addons/${c.dataset.aon}`, { enabled: c.checked }, "PUT"); drawAddons(); } catch (er) { toast(er.message, 5000); }
    }));
    $$("[data-cat]", box).forEach((c) => (c.onchange = async () => {
      const id = c.dataset.cat;
      const hidden = $$(`[data-cat="${id}"]`, box).filter((x) => !x.checked).map((x) => x.dataset.key);
      try { await api(`/api/admin/addons/${id}`, { hidden }, "PUT"); toast(c.checked ? "Shelf shown on Home" : "Shelf hidden from Home"); } catch (er) { toast(er.message, 5000); }
    }));
    $$("[data-aref]", box).forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      try { await api(`/api/admin/addons/${b.dataset.aref}`, { refresh: true }, "PUT"); toast("Addon refreshed"); drawAddons(); } catch (er) { toast(er.message, 5000); b.disabled = false; }
    }));
    $$("[data-arm]", box).forEach((b) => (b.onclick = async () => {
      const a = r.addons.find((x) => x.id === Number(b.dataset.arm));
      if (!(await confirmSheet(`Remove ${a.name}?`, "Its shelves, subtitles and metadata won't be used anymore. You can install it again later.", "Remove"))) return;
      try { await api(`/api/admin/addons/${a.id}`, undefined, "DELETE"); toast("Addon removed"); drawAddons(); } catch (er) { toast(er.message, 5000); }
    }));
  }

  // ---------------------------------------------------------- sync page
  async function pageSync() {
    app.innerHTML = topbar("sync") + `<main class="page"><h1 class="large-title">Sync</h1><div id="syncBody"><div class="card skel" style="height:220px"></div></div></main>`;
    wireTopbar();
    startPoll(drawSync, 2000);
  }

  async function drawSync() {
    SYNC = await api("/api/admin/sync");
    updateSyncChip();
    const b = $("#syncBody");
    if (!b) return;
    const s = SYNC, st = s.status || {}, c = s.current, svc = s.service;
    const running = svc.state === "active" || svc.state === "activating";
    const ss = syncState(s);
    const pct = c && c.total ? c.bytes / c.total : 0;
    const eta = c && c.speed > 0 ? (c.total - c.bytes) / c.speed : null;
    const last = st.last_run;
    const failed = st.failed || [];
    const skipped = st.skipped || [];
    let headline, line;
    if (s.paused) {
      const forever = s.paused.until > 32000000000;
      headline = forever ? "Paused until you resume" : `Paused until ${when(s.paused.until)}`;
      line = "Scheduled syncs are skipped while paused.";
    } else if (running && c) {
      headline = c.title ? `${c.title}${c.episode != null ? " " + epLabel(c.season, c.episode) : ""}` : c.name;
      line = c.name;
    } else if (running) {
      headline = st.state === "listing" ? "Checking TorBox for new downloads" : "Starting";
      line = "";
    } else {
      headline = last ? (last.result === "ok" ? (last.new ? `Downloaded ${last.new} new file${last.new === 1 ? "" : "s"}` : "Everything is up to date")
        : last.result === "error" ? "The last sync failed" : last.result === "stopped" ? "The last sync was stopped" : "Waiting for the next sync") : "No sync has run yet";
      line = last ? `${last.message ? last.message + ". " : ""}Finished ${ago(last.finished)}.` : "";
    }
    const post = s.poster ? `<img src="${img(s.poster)}" alt="" data-fallback="hide">` : `<div class="ph" style="--h:${hue(headline)}"></div>`;

    b.innerHTML = `<div class="cards">
      <section class="card now-card span-12">
        ${c && c.background ? `<div class="bgblur" style="background-image:url('${img(c.background)}')"></div>` : ""}
        <div class="post">${post}</div>
        <div style="min-width:0">
          <div class="state-line ${ss.cls}"><span class="dot"></span>${running ? (c ? "Downloading" : "Running") : s.paused ? "Paused" : ss.cls === "error" ? "Needs attention" : "Idle"}</div>
          <div class="now-title">${esc(headline)}</div>
          ${line ? `<div class="secondary" style="font-size:14px;overflow-wrap:anywhere">${esc(line)}</div>` : ""}
          ${running && c ? `<div class="progress"><i style="width:${pct * 100}%"></i></div>
            <div class="kv"><span><b>${Math.floor(pct * 100)}%</b></span><span><b>${bytes(c.bytes)}</b> of ${bytes(c.total)}</span><span><b>${rate(c.speed)}</b></span>${eta != null ? `<span><b>${dur(eta)}</b> left</span>` : ""}
            ${st.queue_total ? `<span>File <b>${Math.min(st.queue_done + 1, st.queue_total)}</b> of ${st.queue_total}</span>` : ""}</div>` : ""}
          <div class="actions" style="margin-top:18px">
            ${running ? `<button class="btn danger small" data-act="stop">${ic("stop")} Stop Sync</button>`
              : `<button class="btn primary small" data-act="start">${ic("refresh")} Sync Now</button>`}
            ${s.paused ? `<button class="btn secondary small" data-act="resume">${ic("play")} Resume</button>` : ""}
          </div>
        </div>
      </section>
      <section class="card span-4"><h3>Next Sync</h3>
        <div class="big" style="font-size:26px">${s.paused ? "Paused" : esc(when(s.timer.next))}</div>
        <div class="note">${s.timer.last ? `Last started ${esc(when(s.timer.last))}` : "Runs every day on the timer"}${s.timer.state && s.timer.state !== "active" ? ". The timer is off, enable it with systemctl" : ""}</div></section>
      <section class="card span-4"><h3>Last Run</h3>
        <div class="big" style="font-size:26px">${last ? `${last.new} new` : "–"}</div>
        <div class="note ${last && last.result === "error" ? "err-note" : ""}">${last ? `${last.failed ? `${last.failed} failed, ` : ""}${last.skipped ? `${last.skipped} skipped, ` : ""}took ${dur(last.finished - last.started)}${last.result === "error" && last.message ? `. ${esc(last.message)}` : ""}` : "Nothing yet"}</div></section>
      <section class="card span-4"><h3>Service</h3>
        <div class="big" style="font-size:26px;text-transform:capitalize">${esc(svc.state || "unknown")}</div>
        <div class="note">${svc.error ? esc(svc.error) : `Result: ${esc(svc.result || "–")}`}</div></section>
      <section class="card span-6"><h3>Pause Syncing</h3>
        <div class="secondary" style="font-size:15px">Stops the current download and skips scheduled syncs until the time runs out.</div>
        <div class="presets">${[[24, "1 day"], [48, "2 days"], [72, "3 days"], [168, "1 week"], [336, "2 weeks"], [0, "Until I resume"]]
          .map(([h, l]) => `<button class="btn secondary small" data-pause="${h}">${l}</button>`).join("")}</div>
        <form class="custom-pause" id="customPause"><label for="ph">Or pause for</label><input id="ph" type="number" min="1" max="2000" step="1" value="6" inputmode="numeric"><span>hours</span>
          <button class="btn secondary small" type="submit">Pause</button></form></section>
      <section class="card span-6"><h3>Recently Downloaded</h3>
        <div class="list">${(st.recent || []).slice(0, 8).map((r) => `<div class="li"><span class="grow">${esc(r.name)}</span><span class="r">${bytes(r.size)}</span><span class="r">${ago(r.at)}</span></div>`).join("") || `<div class="secondary" style="font-size:15px;padding-top:8px">Finished downloads show up here.</div>`}</div>
      </section>
      ${failed.length ? `<section class="card span-6"><h3 style="display:flex;align-items:center">Failed Downloads<button class="btn secondary small" style="margin-left:auto" data-act="retry" ${running ? "disabled" : ""}>${ic("refresh")} Retry Failed</button></h3>
        <div class="list">${failed.slice(0, 8).map((f) => `<div class="li"><span class="grow" title="${esc(f.error)}">${esc(f.name)}</span><span class="r err-note">${esc((f.error || "Failed").slice(0, 40))}</span></div>`).join("")}</div>
        <div class="note">Failed files are tried again on every sync, Retry just does it now.</div></section>` : ""}
      ${skipped.length ? `<section class="card span-6"><h3>Skipped as Duplicates</h3>
        <div class="list">${skipped.slice(0, 8).map((f) => `<div class="li"><span class="grow" title="${esc(f.name)}">${esc(f.name)}</span><span class="r">${esc(f.reason)}</span></div>`).join("")}</div>
        <div class="note">Kino skips copies of something you already have in 1080p or better, and only keeps one copy when TorBox has several.</div></section>` : ""}
      <section class="card span-12" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px"><h3>Library</h3><div style="font-size:15px">${s.library.files} files, last scanned ${s.library.scanned_at ? ago(s.library.scanned_at) : "never"}</div></div>
        <button class="btn secondary small" id="rescan">${ic("refresh")} Rescan Library</button></section>
    </div>`;

    b.querySelectorAll("[data-act]").forEach((x) => (x.onclick = () => syncAction(x.dataset.act)));
    b.querySelectorAll("[data-pause]").forEach((x) => (x.onclick = () => syncAction("pause", { hours: Number(x.dataset.pause) })));
    $("#customPause").onsubmit = (e) => { e.preventDefault(); const h = Number($("#ph").value); if (h > 0) syncAction("pause", { hours: h }); };
    $("#rescan").onclick = async () => { await api("/api/admin/rescan", {}); toast("Rescanning the library"); };
  }

  async function syncAction(act, body = {}) {
    const msgs = { start: "Sync started", retry: "Retrying failed downloads", stop: "Stopping the sync", resume: "Sync resumed", pause: "Sync paused" };
    try {
      await api(`/api/admin/sync/${act}`, body);
      toast(msgs[act]);
      setTimeout(drawSync, 600);
    } catch (e) { toast(e.message, 6000); }
  }

  // ---------------------------------------------------------- server page
  function spark(vals, max, color, fill = true) {
    const w = 300, h = 64, n = vals.length;
    if (n < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"></svg>`;
    const m = max || Math.max(...vals, 1);
    const pts = vals.map((v, i) => `${((i / (n - 1)) * w).toFixed(1)},${(h - 2 - (Math.min(v, m) / m) * (h - 6)).toFixed(1)}`);
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      ${fill ? `<polygon points="0,${h} ${pts.join(" ")} ${w},${h}" fill="${color}" opacity="0.18"/>` : ""}
      <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  }
  function storageCard(title, d, color, sub) {
    if (!d) return `<section class="card span-6"><h3>${title}</h3><div class="big" style="font-size:24px">Not mounted</div><div class="note err-note">${sub || ""}</div></section>`;
    const p = d.used / d.total;
    const cls = p > 0.92 ? "red" : p > 0.8 ? "orange" : color;
    return `<section class="card span-6"><h3>${title}</h3>
      <div class="storage-big"><span class="big">${bytes(d.free)}</span><span class="secondary">free of ${bytes(d.total)}</span></div>
      <div class="progress ${cls}"><i style="width:${p * 100}%"></i></div>
      <div class="kv"><span><b>${bytes(d.used)}</b> used</span><span><b>${Math.round(p * 100)}%</b> full</span></div></section>`;
  }

  async function pageServer() {
    app.innerHTML = topbar("server") + `<main class="page"><h1 class="large-title">Server</h1><div id="srvBody"><div class="card skel" style="height:220px"></div></div>
      <div id="storageReview"></div></main>`;
    wireTopbar();
    startPoll(drawServer, 3000);
    drawStorageReview();
  }

  // What could be cleared off the Storage Box, things everyone has watched and things nobody started in months
  async function drawStorageReview() {
    const r = await api("/api/admin/storage").catch(() => null);
    const box = $("#storageReview");
    if (!r || !box) return;
    const row = (t, sub) => `<div class="sr-row"><span class="fm-post">${t.poster ? `<img src="${img(t.poster)}" alt="" data-fallback="hide">` : ""}</span>
      <span class="grow"><b>${esc(t.name)}</b><span class="secondary">${esc(sub)}</span></span><span class="secondary sr-size">${bytes(t.size)}</span>
      <button class="round-btn sm" data-clear="${t.id}" data-name="${esc(t.name)}" data-size="${t.size}" aria-label="Delete ${esc(t.name)}" title="Delete from Library">${ic("trash")}</button></div>`;
    const sum = (l) => l.reduce((a, t) => a + t.size, 0);
    const st = r.storage;
    box.innerHTML = `<section class="card storage-review">
      <div class="sr-head"><div><h2 class="set-title">Free Up Space</h2>
        <p class="secondary set-hint">${st ? `The Storage Box is ${Math.round(st.pct)}% full with ${bytes(st.free)} left.${st.warn ? " It's getting full, these are the easiest things to clear." : ""}` : "The Storage Box isn't connected right now."}</p></div></div>
      <h3 class="sr-sub">Watched by Everyone <span class="secondary">${r.watched_by_everyone.length ? bytes(sum(r.watched_by_everyone)) : ""}</span></h3>
      ${r.watched_by_everyone.length ? r.watched_by_everyone.map((t) => row(t, `${t.kind === "series" ? `${t.count} episodes` : "Movie"} · last watched ${ago(t.last)}`)).join("") : `<p class="secondary sr-empty">Nothing yet, every profile has to have finished it.</p>`}
      <h3 class="sr-sub">Not Started in 3 Months <span class="secondary">${r.never_watched.length ? bytes(sum(r.never_watched)) : ""}</span></h3>
      ${r.never_watched.length ? r.never_watched.map((t) => row(t, `${t.kind === "series" ? `${t.count} episodes` : "Movie"} · added ${ago(t.added)}`)).join("") : `<p class="secondary sr-empty">Nothing, everything older has been watched by someone.</p>`}
    </section>`;
    $$("[data-clear]", box).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet(`Delete ${b.dataset.name}?`, `${bytes(Number(b.dataset.size))} is removed from the Storage Box for everyone. The sync won't download it again.`, "Delete"))) return;
      try { const x = await api(`/api/admin/title/${b.dataset.clear}`, undefined, "DELETE"); toast(`Deleted, ${bytes(x.freed)} freed`); drawStorageReview(); }
      catch (e) { toast(e.message, 5000); }
    }));
  }

  async function drawServer() {
    const s = await api("/api/admin/stats");
    const b = $("#srvBody");
    if (!b) return;
    const h = s.hist, last = h[h.length - 1] || { cpu: 0, mem: 0, rx: 0, tx: 0, rd: 0, wr: 0 };
    const netMax = Math.max(...h.map((x) => Math.max(x.rx, x.tx)), 1024);
    const ioMax = Math.max(...h.map((x) => Math.max(x.rd, x.wr)), 1024);
    const wd = s.watchdog;
    b.innerHTML = `<div class="cards">
      <section class="card span-3"><h3>CPU</h3><div class="big">${Math.round(last.cpu)}<small>%</small></div>${spark(h.map((x) => x.cpu), 100, "#0a84ff")}
        <div class="note">${s.cores} cores, load ${s.load.map((l) => l.toFixed(2)).join(" ")}</div></section>
      <section class="card span-3"><h3>Memory</h3><div class="big">${Math.round(s.mem.percent)}<small>%</small></div>${spark(h.map((x) => x.mem), 100, "#30d158")}
        <div class="note">${bytes(s.mem.used)} of ${bytes(s.mem.total)}${s.swap.total ? `, swap ${bytes(s.swap.used)}` : ""}</div></section>
      <section class="card span-3"><h3>Network</h3><div class="big" style="font-size:26px">${rate(last.rx)}</div>${spark(h.map((x) => x.rx), netMax, "#64d2ff")}
        <div class="legend"><span><i style="background:#64d2ff"></i>In ${rate(last.rx)}</span><span><i style="background:#bf5af2"></i>Out ${rate(last.tx)}</span></div></section>
      <section class="card span-3"><h3>Disk Activity</h3><div class="big" style="font-size:26px">${rate(last.rd + last.wr)}</div>${spark(h.map((x) => x.rd + x.wr), ioMax, "#ff9f0a")}
        <div class="legend"><span>Read ${rate(last.rd)}</span><span>Write ${rate(last.wr)}</span></div></section>
      ${storageCard("Storage Box", s.disks.box, "blue", "The watchdog reconnects it automatically within a minute.")}
      ${storageCard("VPS Disk", s.disks.vps, "")}
      <section class="card span-8"><h3>Busiest Processes</h3><div class="list">${s.procs.map((p) => `<div class="li"><span class="grow">${esc(p.name)} <span class="tertiary">${esc(p.user || "")}</span></span><span class="r">${p.cpu.toFixed(1)}% CPU</span><span class="r">${bytes(p.mem)}</span></div>`).join("")}</div></section>
      <section class="card span-4"><h3>Mount Watchdog</h3>
        ${wd ? `<div class="state-line ${wd.ok ? "running" : "error"}" style="margin-top:6px"><span class="dot"></span>${wd.ok ? "Storage Box connected" : "Reconnecting"}</div>
          <div class="note">Checked ${ago(wd.last_check)}. ${wd.remounts ? `Reconnected ${wd.remounts} time${wd.remounts === 1 ? "" : "s"}, last ${ago(wd.last_remount)}.` : "No reconnects needed."}${wd.last_error ? `<br><span class="err-note">${esc(wd.last_error)}</span>` : ""}</div>`
          : `<div class="note">The watchdog hasn't reported yet. It runs every minute once installed.</div>`}
        <h3 style="margin-top:18px">Uptime</h3><div class="big" style="font-size:22px">${dur(s.uptime)}</div>
        <div class="note">${s.players} active player${s.players === 1 ? "" : "s"}</div></section>
    </div>`;
  }

  // ---------------------------------------------------------- polling
  // Finds the same control again after a redraw, by id, data attribute or text
  function focusKey(el) {
    if (!el || el === document.body || !app.contains(el)) return null;
    if (el.id) return `#${CSS.escape(el.id)}`;
    const d = Object.keys(el.dataset)[0];
    if (d) return `[data-${d.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}="${CSS.escape(el.dataset[d])}"]`;
    return { text: el.textContent.trim(), tag: el.tagName };
  }
  function refocus(k) {
    if (!k) return;
    const el = typeof k === "string" ? $(k, app) : $$(k.tag, app).find((x) => x.textContent.trim() === k.text);
    if (el && el !== document.activeElement) el.focus({ preventScroll: true });
  }
  function startPoll(fn, ms) {
    stopPoll();
    const tick = async () => {
      const k = focusKey(document.activeElement);
      try { await fn(); } catch (e) { if (e.message !== "pick profile") console.warn(e); }
      refocus(k);
      if (POLL) POLL.t = setTimeout(tick, document.hidden ? ms * 5 : ms);
    };
    POLL = { t: null };
    tick();
  }
  function stopPoll() { if (POLL) clearTimeout(POLL.t); POLL = null; }

  // ---------------------------------------------------------- player
  const pl = {
    el: $("#player"), v: $("#video"), info: null, mode: null, hls: null, sid: null, offset: 0, audio: 0,
    cues: null, subId: null, title: null, saveT: null, idleT: null, dragging: false, upNextT: null, upNextShown: false, introSkipped: false, rate: 1,
  };
  $("#pClose").innerHTML = ic("close");
  if (ANDROID && TV) $("#pClose").hidden = true;
  $("#pBack").innerHTML = ic("back10");
  $("#pFwd").innerHTML = ic("fwd10");
  $("#pFull").innerHTML = ic("full");
  $("#pMute").innerHTML = ic("vol");
  $("#pSpeed").innerHTML = ic("speed");
  $("#pAir").innerHTML = ic("airplay");
  $("#pPip").innerHTML = ic("pip");

  const pos = () => (pl.mode === "hls" ? pl.offset + pl.v.currentTime : pl.v.currentTime);
  const total = () => (pl.info && pl.info.duration) || pl.v.duration || 0;
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

  function codecOk(codec) {
    const MS = window.ManagedMediaSource || window.MediaSource;
    const types = { h264: 'video/mp4; codecs="avc1.640028"', hevc: 'video/mp4; codecs="hvc1.1.6.L150.90"', av1: 'video/mp4; codecs="av01.0.08M.08"', vp9: 'video/mp4; codecs="vp09.00.40.08"' };
    const t = types[codec];
    if (!t) return true;
    return (MS && MS.isTypeSupported && MS.isTypeSupported(t)) || pl.v.canPlayType(t) !== "";
  }

  function showMsg(title, text, actions = "") {
    loadHide();
    const m = $("#pMsg");
    m.innerHTML = `<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="actions" style="justify-content:center">${actions}</div>`;
    m.hidden = false;
    spinner(false);
  }
  const spinner = (on) => ($("#playerSpinner").hidden = !on);

  // Loading screen like stremio: the artwork, the logo pulsing and what Kino is doing underneath. The lines can be
  // turned off per profile in Settings, the artwork and logo always show
  const LOAD = { on: false, t0: 0, lines: [], stats: true, timer: null };
  function loadShow(art, name) {
    const el = $("#pLoad");
    LOAD.on = true; LOAD.t0 = performance.now(); LOAD.lines = [];
    LOAD.stats = !(ME.profile && ME.profile.prefs && ME.profile.prefs.load_stats === false);
    $("#plBg").innerHTML = art && art.background ? `<img src="${img(art.background)}" alt="" data-fallback="hide">` : "";
    loadLogo(art, name);
    $("#plStats").innerHTML = "";
    el.classList.toggle("no-stats", !LOAD.stats);
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("on"));
    clearInterval(LOAD.timer);
    LOAD.timer = setInterval(drawLoad, 500);
  }
  function loadLogo(art, name) {
    const box = $("#plLogo");
    if (art && art.logo) box.innerHTML = `<img src="${img(art.logo, 1)}" alt="${esc(name || "")}" data-fallback="text" data-cls="pl-name">`;
    else box.innerHTML = `<div class="pl-name">${esc(name || "")}</div>`;
  }
  function loadArt(art, name) {
    if (!LOAD.on || !art) return;
    if (art.background && !$("#plBg img")) $("#plBg").innerHTML = `<img src="${img(art.background)}" alt="" data-fallback="hide">`;
    if (art.logo && !$("#plLogo img")) loadLogo(art, name);
  }
  // Each step is one line, the newest one is the one that's still going
  function loadStep(text) {
    if (!LOAD.on) return;
    const last = LOAD.lines[LOAD.lines.length - 1];
    if (last) last.done = performance.now();
    LOAD.lines.push({ text, t: performance.now(), done: 0 });
    drawLoad();
  }
  function loadNote(text) { if (LOAD.on && LOAD.lines.length) { LOAD.lines[LOAD.lines.length - 1].note = text; drawLoad(); } }
  function drawLoad() {
    if (!LOAD.on || !LOAD.stats) return;
    const now = performance.now();
    // Lines are kept and only there text changes, so each one slides in once instead of every half second
    const box = $("#plStats"), shown = LOAD.lines.slice(-4);
    while (box.children.length > shown.length || (box.firstElementChild && !shown.some((l) => l.el === box.firstElementChild))) box.firstElementChild.remove();
    for (const l of shown) {
      if (!l.el) { l.el = document.createElement("div"); l.el.innerHTML = "<span></span><span class=\"pl-note\"></span><b></b>"; box.appendChild(l.el); }
      const secs = ((l.done || now) - l.t) / 1000;
      l.el.className = l.done ? "done" : "now";
      l.el.children[0].textContent = l.text;
      l.el.children[1].textContent = l.note || "";
      l.el.children[1].hidden = !l.note;
      l.el.children[2].textContent = secs < 0.1 ? "" : secs.toFixed(1) + " s";
    }
  }
  function loadHide() {
    if (!LOAD.on) return;
    LOAD.on = false;
    clearInterval(LOAD.timer);
    const el = $("#pLoad");
    el.classList.remove("on");
    setTimeout(() => { if (!LOAD.on) el.hidden = true; }, 450);
  }

  // Picks the audio track for the profile's language. Tracks are matched by there language tag first, then by the name
  // the file gives them, cause plenty of files have untagged tracks just called "English" or "ENG 5.1"
  const LANG_CODES = { English: ["en", "eng"], German: ["de", "ger", "deu"], French: ["fr", "fre", "fra"], Spanish: ["es", "spa"], Italian: ["it", "ita"], Dutch: ["nl", "dut", "nld"], Polish: ["pl", "pol"], Portuguese: ["pt", "por"], Russian: ["ru", "rus"], Japanese: ["ja", "jpn"], Korean: ["ko", "kor"], Chinese: ["zh", "chi", "zho"], Swedish: ["sv", "swe"], Danish: ["da", "dan"], Norwegian: ["no", "nor"], Finnish: ["fi", "fin"], Turkish: ["tr", "tur"], Arabic: ["ar", "ara"], Hindi: ["hi", "hin"] };
  function pickAudio(info, want) {
    if (!want || !info.audio || info.audio.length < 2) return info.default_audio;
    const codes = LANG_CODES[want] || [];
    const has = (x) => {
      const l = String(x.lang || "").toLowerCase(), lab = String(x.label || "").toLowerCase();
      if (l === want.toLowerCase() || codes.includes(l)) return true;
      return lab.includes(want.toLowerCase()) || codes.some((c) => new RegExp(`(^|[^a-z])${c}([^a-z]|$)`).test(lab));
    };
    // Commentary tracks are nearly always the second english one, skip them unless theres nothing else
    const hits = info.audio.filter(has);
    const main = hits.find((x) => !/comment/i.test(x.label || "")) || hits[0];
    return main ? main.n : info.default_audio;
  }

  // ---------------------------------------------------------- the android app's own player
  // In the app videos go to exoplayer, the tv's hardware decoder plays them directly. The web player is still there as
  // a setting on this device, and as the backup if the app player cant play something
  const NATIVE_KEY = "kino-native";
  const nativeOk = () => ANDROID && typeof window.KinoAndroid.playNative === "function";
  const useNative = () => { if (!nativeOk()) return false; try { return localStorage.getItem(NATIVE_KEY) !== "0"; } catch (_) { return true; } };
  let NATIVE = null;

  async function nativePlay(fid, opts) {
    let info;
    try { info = await api(`/api/file/${fid}`); } catch (e) { toast(e.message, 5000); return; }
    const prefs = info.prefs || {};
    const t = opts.title;
    const f = t && t.files && t.files.find((x) => x.id === fid);
    const audioN = pickAudio(info, prefs.audio_lang);
    // Subtitle files next to the video and from addons get handed over, the ones inside the file exoplayer finds itself
    const subs = info.subs.filter((x) => x.kind === "file").map((x) => ({ url: `/api/subs/${fid}/${x.id}`, label: x.label, lang: langCode(x.lang || x.label) }));
    try {
      const extra = await Promise.race([api(`/api/addon-subs/${fid}`), new Promise((r) => setTimeout(() => r({ subs: [] }), 2500))]);
      (extra.subs || []).slice(0, 12).forEach((x) => subs.push({ url: `/api/subs/${fid}/${x.id}`, label: x.label + (x.source ? ` (${x.source})` : ""), lang: langCode(x.lang) }));
    } catch (_) {}
    const url = !info.stream ? `/api/stream/${fid}/direct` : info.src || `/api/rstream/${fid}`;
    const sub = info.stream ? [info.season != null ? epLabel(info.season, info.episode) : "", nice(info.ep_name || "")].filter(Boolean).join("  ")
      : t && t.kind === "series" && f ? `${epLabel(f.season, f.episode)}${f.ep_name ? "  " + nice(f.ep_name) : ""}` : "";
    NATIVE = { fid, info, opts };
    pl.title = t || null;
    window.KinoAndroid.playNative(JSON.stringify({
      base: location.origin, ua: navigator.userAgent, fid, url, title: (t && t.name) || info.show || info.name, sub,
      start: opts.from != null ? opts.from : info.resume || 0, duration: info.duration || 0,
      audioN, audioChosen: audioN !== info.default_audio, audioLang: langCode(prefs.audio_lang), subLang: langCode(prefs.sub_lang), subs,
      intro: info.intro, autoSkip: !!prefs.skip_intro, stillMins: Number(prefs.still_watching) || 0, dovi: !!(info.video && info.video.dovi),
      forceHls: !!(info.video && info.video.codec && !["h264", "hevc", "av1", "vp9", "mpeg4", "mpeg2video", "vp8"].includes(info.video.codec)),
    }));
  }
  // English to en and so on, exoplayer matches tracks by these codes
  const langCode = (l) => { if (!l) return ""; const c = LANG_CODES[l] || LANG_CODES[String(l).split(" ")[0]]; return c ? c[0] : String(l).length <= 3 ? String(l).toLowerCase() : ""; };
  window.kinoNativeDone = (r) => {
    const cur = NATIVE; NATIVE = null;
    if (!r || !cur) return;
    if (r.error) {
      toast(`${r.error}. Trying the web player instead.`, 6000);
      return playFile(cur.fid, { ...cur.opts, from: r.pos || cur.opts.from, web: true });
    }
    const n = cur.info.next, auto = !cur.info.prefs || cur.info.prefs.autoplay !== false;
    if (r.ended && n && auto) return playNext(n);
    // Redraws the page so resume bars and watched ticks are right
    if (ME.profile) setTimeout(route, 300);
  };

  async function playFile(fid, opts = {}) {
    if (!opts.web && useNative()) return nativePlay(fid, opts);
    closePlayer(true);
    clearInterval(HERO_T);
    pl.el.hidden = false;
    document.body.style.overflow = "hidden";
    spinner(false);
    const tt = opts.title;
    loadShow(tt ? { background: tt.background, logo: tt.logo } : opts.art, tt ? tt.name : opts.name || "");
    loadStep("Getting the file ready");
    $("#pMsg").hidden = true;
    $("#upNext").hidden = true;
    $("#skipIntro").hidden = true;
    $("#subsLayer").innerHTML = "";
    let info;
    try { info = await api(`/api/file/${fid}`); } catch (e) { loadHide(); showMsg("Can't play this file", e.message); return; }
    loadArt(info.art, (opts.title && opts.title.name) || info.show || info.name);
    if (!$("#plLogo").textContent.trim() && !$("#plLogo img")) loadLogo(info.art, info.show || info.name);
    pl.info = info; pl.cues = null; pl.subId = null; pl.upNextShown = false; pl.introSkipped = false;
    pl.title = opts.title || null;
    const prefs = info.prefs || {};
    $("#subsLayer").dataset.size = prefs.sub_size || "m";

    // Picks the audio and subtitles from the profile settings
    pl.audio = pickAudio(info, prefs.audio_lang);
    const t = opts.title;
    $("#pTitle").textContent = t ? t.name : info.name;
    if (info.stream && info.src) {
      $("#pSub").textContent = [info.season != null ? epLabel(info.season, info.episode) : "", nice(info.ep_name || "")].filter(Boolean).join("  ");
      buildMenus();
      setupDeviceButtons();
      pl.mode = "direct";
      loadStep("Connecting to the source");
      pl.v.src = info.src;
      const from = opts.from != null ? opts.from : info.resume || 0;
      pl.v.addEventListener("loadedmetadata", () => { if (from && from < pl.v.duration - 10) pl.v.currentTime = from; }, { once: true });
      pl.v.addEventListener("error", async () => {
        if (pl.info !== info) return;
        // Asks the server what went wrong, so a blocked redirect says where it was going instead of a vague message
        let why = "The source may be slow, or this browser can't play its format. Try another source or save it to the Library.";
        try { const r = await fetch(info.src, { headers: { Range: "bytes=0-0" }, credentials: "same-origin" }); if (!r.ok) { const j = await r.json().catch(() => null); if (j && j.detail) why = j.detail; } } catch (_) {}
        showMsg("This copy won't play here", why, `<a class="btn secondary small" href="${esc(info.download)}">${ic("download")} Download instead</a>`);
      }, { once: true });
      pl.v.play().catch(() => {});
      pl.v.playbackRate = pl.rate;
      api(`/api/addon-subs/${fid}`).then((r) => {
        if (!pl.info || pl.info.id !== fid || !r.subs.length) return;
        const mine = (x) => (prefs.sub_lang && x.lang.startsWith(prefs.sub_lang) ? 0 : 1);
        info.subs = r.subs.slice().sort((a, b) => mine(a) - mine(b));
        buildMenus();
        if (prefs.sub_lang && !pl.subId) { const s = info.subs.find((x) => x.lang.startsWith(prefs.sub_lang)); if (s) loadSubs(s.id, true); }
      }).catch(() => {});
      pl.evStarted = false; pl.subUserSet = false;
      pl.saveT = setInterval(saveProgress, 10000);
      wakeUi();
      return;
    }
    const f = t && t.files.find((x) => x.id === fid);
    $("#pSub").textContent = info.stream ? [info.season != null ? epLabel(info.season, info.episode) : "", nice(info.ep_name || ""), ...(info.badges || [])].filter(Boolean).join("  ")
      : t && t.kind === "series" && f ? `${epLabel(f.season, f.episode)}${f.ep_name ? "  " + nice(f.ep_name) : ""}` : (info.badges || []).join("  ");
    buildMenus();
    setupDeviceButtons();
    const start = opts.from != null ? opts.from : (info.stream && info.resume) || 0;
    const vcodec = info.video && info.video.codec;
    const dlBtn = `<a class="btn secondary small" href="${esc(info.download)}&save=1">${ic("download")} Download</a>
      <button class="btn secondary small" id="copyLink">${ic("link")} Copy link for VLC</button>`;

    if (info.direct && codecOk(vcodec) && pl.audio === info.default_audio) {
      pl.mode = "direct";
      loadStep("Direct play");
      loadNote([vcodec && vcodec.toUpperCase(), ...(info.badges || [])].filter(Boolean).join(" · "));
      pl.v.src = `/api/stream/${fid}/direct`;
      pl.v.addEventListener("loadedmetadata", () => { if (start) pl.v.currentTime = start; }, { once: true });
      pl.v.play().catch(() => {});
    } else if (!codecOk(vcodec)) {
      loadHide();
      showMsg("This browser can't play this video", `It uses ${String(vcodec).toUpperCase()} video. Safari or Chrome on a Mac usually can, or you can download it and use VLC.`, dlBtn);
      wireCopy(info);
      return;
    } else {
      await startHls(start);
    }
    pl.v.playbackRate = pl.rate;
    const pickSub = () => {
      if (!prefs.sub_lang || pl.subId || pl.subUserSet) return;
      const s = info.subs.find((x) => !x.forced && (x.lang === prefs.sub_lang || x.label.startsWith(prefs.sub_lang)));
      if (s) loadSubs(s.id, true);
    };
    pickSub();
    pl.subUserSet = false;
    // Subtitles from addons come in after the video starts so a slow addon never holds up playback
    api(`/api/addon-subs/${fid}`).then((r) => {
      if (!pl.info || pl.info.id !== fid || !r.subs.length) return;
      const mine = (x) => (prefs.sub_lang && x.lang.startsWith(prefs.sub_lang) ? 0 : 1);
      info.subs = info.subs.concat(r.subs.slice().sort((a, b) => mine(a) - mine(b)));
      buildMenus();
      pickSub();
    }).catch(() => {});
    pl.evStarted = false;
    pl.saveT = setInterval(saveProgress, 10000);
    wakeUi();
  }

  function wireCopy(info) {
    const b = $("#copyLink");
    if (b) b.onclick = async () => {
      try { await navigator.clipboard.writeText(location.origin + info.download); toast("Link copied, it works for 6 hours"); }
      catch (_) { toast("Couldn't copy, your browser blocked it"); }
    };
  }

  async function startHls(t) {
    if (!LOAD.on) spinner(true);
    $("#pMsg").hidden = true;
    if (pl.hls) { pl.hls.destroy(); pl.hls = null; }
    let r;
    const vc = pl.info.video || {};
    loadStep(vc.codec && !["h264", "hevc", "av1", "vp9"].includes(vc.codec) ? "Converting the video for this screen" : "Starting the stream");
    const au = (pl.info.audio || []).find((x) => x.n === pl.audio);
    loadNote([au && au.label, vc.dovi ? "Dolby Vision to HDR" : "", t > 1 ? `from ${clock(t)}` : ""].filter(Boolean).join(" · "));
    try {
      r = await api(`/api/play/${pl.info.id}`, { t, audio: pl.audio, hevc: codecOk("hevc") });
    } catch (e) {
      loadHide();
      showMsg("Playback couldn't start", e.message, `<a class="btn secondary small" href="${esc(pl.info.download)}&save=1">${ic("download")} Download instead</a>`);
      return;
    }
    if (pl.el.hidden) { api(`/api/play/${r.sid}/stop`, {}).catch(() => {}); return; }
    pl.mode = "hls"; pl.sid = r.sid; pl.offset = r.offset;
    loadStep("Buffering");
    // Safari plays the stream itself which keeps AirPlay working, everyone else uses hls.js
    if (isSafari && pl.v.canPlayType("application/vnd.apple.mpegurl")) {
      pl.v.src = r.url;
    } else if (window.Hls && Hls.isSupported()) {
      // startPosition 0 cause the playlist is still growing and hls.js would otherwise jump to the end
      const h = new Hls({ startPosition: 0, maxBufferLength: 60, backBufferLength: 120, manifestLoadingMaxRetry: 6, levelLoadingMaxRetry: 6, fragLoadingMaxRetry: 6 });
      pl.hls = h;
      // Download speed for the loading screen, from the segments hls.js fetches
      h.on(Hls.Events.FRAG_LOADED, (_, d) => {
        const st = d.frag && d.frag.stats, b = st && (st.total || st.loaded);
        const ms = st && st.loading ? st.loading.end - st.loading.start : 0;
        if (b && ms > 0) loadNote(`${(b * 8 / ms / 1000).toFixed(1)} Mbps`);
      });
      h.on(Hls.Events.ERROR, (_, d) => {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR) h.recoverMediaError();
        else {
          showMsg("Playback stopped", "The stream was interrupted. Try again, or download the file instead.", `<button class="btn primary small" id="retry">Try Again</button>`);
          $("#retry").onclick = () => startHls(pos());
        }
      });
      h.loadSource(r.url);
      h.attachMedia(pl.v);
    } else {
      pl.v.src = r.url;
    }
    pl.v.play().catch(() => {});
    pl.v.playbackRate = pl.rate;
  }

  function seekTo(target) {
    target = Math.max(0, Math.min(target, total() - 1));
    if (pl.mode === "direct") { pl.v.currentTime = target; return; }
    const rel = target - pl.offset;
    const se = pl.v.seekable.length ? pl.v.seekable.end(pl.v.seekable.length - 1) : 0;
    // Inside what the server already made we just jump there, further ahead it restarts the stream from that point
    if (rel >= 0 && rel < se - 2) pl.v.currentTime = rel;
    else startHls(target);
    renderSubs(true);
  }

  function saveProgress() {
    if (!pl.info || !total()) return;
    api("/api/progress", { file_id: pl.info.id, pos: pos(), dur: total() }).catch(() => {});
  }

  // Tells tracking addons what's playing, only when the profile has turned that on
  function sendEvent(action) {
    if (!pl.info || !ME.profile || !ME.profile.prefs || !ME.profile.prefs.share_events) return;
    api("/api/event", { file_id: pl.info.id, action, pos: pos(), dur: total() }).catch(() => {});
  }

  function closePlayer(keepOpen) {
    const wasOpen = !pl.el.hidden;
    if (pl.info) { saveProgress(); if (pl.evStarted) sendEvent("stop"); pl.evStarted = false; }
    clearInterval(pl.saveT);
    clearInterval(pl.upNextT);
    if (pl.hls) { pl.hls.destroy(); pl.hls = null; }
    if (pl.sid) { api(`/api/play/${pl.sid}/stop`, {}).catch(() => {}); pl.sid = null; }
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    pl.v.pause();
    pl.v.removeAttribute("src");
    pl.v.load();
    pl.info = null; pl.mode = null;
    loadHide(); $("#pStill").hidden = true; clearTimeout(STILL.t);
    if (!keepOpen && wasOpen) {
      pl.el.hidden = true;
      document.body.style.overflow = "";
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      // Redraws the page behind so resume bars and watched ticks are up to date
      if (ME.profile && (location.hash.startsWith("#/title/") || location.hash.startsWith("#/discover/") || location.hash === "#/home" || !location.hash)) setTimeout(route, 400);
    }
  }

  function setupDeviceButtons() {
    // Only shows AirPlay and picture in picture when this device can actualy do them
    const air = $("#pAir"), pip = $("#pPip");
    air.hidden = true;
    if (window.WebKitPlaybackTargetAvailabilityEvent) {
      pl.v.addEventListener("webkitplaybacktargetavailabilitychanged", (e) => { air.hidden = e.availability !== "available"; });
      air.onclick = () => pl.v.webkitShowPlaybackTargetPicker && pl.v.webkitShowPlaybackTargetPicker();
    }
    const canPip = (document.pictureInPictureEnabled && !pl.v.disablePictureInPicture) || (pl.v.webkitSupportsPresentationMode && pl.v.webkitSupportsPresentationMode("picture-in-picture"));
    pip.hidden = !canPip;
    pip.onclick = async () => {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else if (pl.v.requestPictureInPicture) await pl.v.requestPictureInPicture();
        else pl.v.webkitSetPresentationMode("picture-in-picture");
      } catch (_) { toast("Picture in picture isn't available right now"); }
    };
  }

  function buildMenus() {
    const info = pl.info;
    $("#pAudio").innerHTML = ic("audio");
    $("#pAudio").hidden = info.audio.length < 2;
    $("#mAudio").innerHTML = info.audio.map((a) => `<button data-a="${a.n}"><span class="chk">${a.n === pl.audio ? ic("check") : ""}</span>${esc(a.label)}</button>`).join("");
    $("#pSubs").innerHTML = ic("cc");
    $("#pSubs").hidden = !info.subs.length;
    $("#mSubs").innerHTML = `<button data-s=""><span class="chk">${!pl.subId ? ic("check") : ""}</span>Off</button>` +
      info.subs.map((s) => `<button data-s="${s.id}"><span class="chk">${s.id === pl.subId ? ic("check") : ""}</span>${esc(s.label)}${s.kind === "embedded" && !s.ready ? ' <span class="tertiary">(prepares first)</span>' : ""}${s.source ? ` <span class="tertiary src">${esc(s.source)}</span>` : ""}</button>`).join("");
    $("#mSpeed").innerHTML = [0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => `<button data-r="${r}"><span class="chk">${r === pl.rate ? ic("check") : ""}</span>${r === 1 ? "Normal" : r + "×"}</button>`).join("");
    $("#pSpeed").innerHTML = ic("speed") + (pl.rate === 1 ? "" : `<span class="rate-badge">${pl.rate}×</span>`);
    $("#mAudio").querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
      pl.audio = Number(b.dataset.a); hideMenus(); buildMenus();
      startHls(pos());  // A different audio track needs a fresh stream from the server
    }));
    $("#mSubs").querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => { hideMenus(); pl.subUserSet = true; loadSubs(b.dataset.s); }));
    $("#mSpeed").querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => { pl.rate = Number(b.dataset.r); pl.v.playbackRate = pl.rate; hideMenus(); buildMenus(); }));
    const ad = $("#pAdminIntro");
    ad.hidden = !(info.is_admin && info.season != null && !info.stream);
    $("#mIntro").innerHTML = `<button data-intro="start">Intro Starts Here</button><button data-intro="end">Intro Ends Here</button>
      ${info.intro && info.intro.source === "marked" ? `<button data-intro="clear">Clear Marked Intro</button>` : ""}`;
    $$("#mIntro [data-intro]").forEach((b) => (b.onclick = () => markIntro(b.dataset.intro)));
  }
  const hideMenus = () => $$(".player .menu").forEach((m) => (m.hidden = true));

  // Admin marks the intro once and it works for the whole season
  let introDraft = {};
  async function markIntro(which) {
    hideMenus();
    const info = pl.info;
    if (which === "clear") {
      await api(`/api/admin/intro/${info.title_id}/${info.season}`, undefined, "DELETE");
      info.intro = null; toast("Marked intro cleared"); buildMenus(); return;
    }
    introDraft[which] = pos();
    if (which === "start") { toast(`Intro start set at ${clock(pos())}. Now go to where it ends.`); return; }
    if (introDraft.start == null) { toast("Set where the intro starts first"); return; }
    try {
      await api("/api/admin/intro", { title_id: info.title_id, season: info.season, start: introDraft.start, end: introDraft.end });
      info.intro = { start: introDraft.start, end: introDraft.end, source: "marked" };
      toast(`Intro saved for season ${info.season}`); introDraft = {}; buildMenus();
    } catch (e) { toast(e.message, 5000); }
  }

  async function loadSubs(id, quiet) {
    pl.subId = id || null; pl.cues = null;
    $("#subsLayer").innerHTML = "";
    buildMenus();
    if (!id) return;
    const fid = pl.info.id;
    for (let i = 0; i < 120; i++) {
      const r = await fetch(`/api/subs/${fid}/${id}`, { credentials: "same-origin" });
      if (!pl.info || pl.info.id !== fid || pl.subId !== id) return;
      if (r.status === 202) {
        if (i === 0) toast("Preparing subtitles. For big files this can take a few minutes.", 6000);
        await new Promise((res) => setTimeout(res, 5000));
        continue;
      }
      if (!r.ok) { toast("Those subtitles couldn't be loaded"); return; }
      pl.cues = parseVtt(await r.text());
      if (!quiet) toast("Subtitles on");
      return;
    }
  }

  function parseVtt(txt) {
    const ts = (s) => { const p = s.trim().split(":").map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
    const cues = [];
    for (const block of txt.replace(/\r/g, "").split(/\n\n+/)) {
      const lines = block.split("\n");
      const i = lines.findIndex((l) => l.includes("-->"));
      if (i < 0) continue;
      const [a, b] = lines[i].split("-->");
      const text = lines.slice(i + 1).join("\n").replace(/<[^>]+>/g, "").replace(/\{\\[^}]*\}/g, "").trim();
      if (text) cues.push({ s: ts(a), e: ts(b.trim().split(/\s/)[0]), text });
    }
    return cues;
  }

  let lastSubText = null;
  function renderSubs(force) {
    if (!pl.cues) return;
    const t = pos();
    const active = pl.cues.filter((c) => c.s <= t && c.e >= t).map((c) => c.text).join("\n");
    if (active === lastSubText && !force) return;
    lastSubText = active;
    $("#subsLayer").innerHTML = active ? `<span>${esc(active)}</span>` : "";
  }

  // Skip intro button, shows while the intro is playing. With the setting on it skips by itself
  function checkIntro() {
    const info = pl.info, btn = $("#skipIntro");
    if (!info || !info.intro) { btn.hidden = true; return; }
    const p = pos(), inIntro = p >= info.intro.start - 1 && p < info.intro.end - 2;
    if (inIntro && info.prefs && info.prefs.skip_intro && !pl.introSkipped) { pl.introSkipped = true; seekTo(info.intro.end); toast("Intro skipped"); return; }
    btn.hidden = !inIntro;
  }

  // Up next card with a countdown like netflix, during the credits or the last 25 seconds
  function checkUpNext() {
    const info = pl.info;
    if (!info || !info.next || pl.upNextShown) return;
    const d = total(), p = pos();
    const at = info.credits || d - 25;
    if (!d || p < at || p < d * 0.5) return;
    pl.upNextShown = true;
    const n = info.next, box = $("#upNext");
    const auto = !info.prefs || info.prefs.autoplay !== false;
    let left = 10;
    box.innerHTML = `<div class="un-thumb">${n.thumbnail ? `<img src="${img(n.thumbnail)}" alt="" data-fallback="hide">` : ""}${auto ? `<svg class="un-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" /></svg>` : ""}</div>
      <div class="un-body"><div class="lbl">Next episode${auto ? ` in <b id="unLeft">${left}</b>` : ""}</div><div class="nm">${esc(epLabel(n.season, n.episode))}${n.name ? "  " + esc(nice(n.name)) : ""}</div>
      <div class="actions"><button class="btn primary small" id="unPlay">${ic("play")} Play Now</button><button class="btn secondary small" id="unHide">${auto ? "Cancel" : "Hide"}</button></div></div>`;
    box.hidden = false;
    const go = () => { clearInterval(pl.upNextT); box.hidden = true; saveProgress(); playNext(n); };
    $("#unPlay").onclick = go;
    $("#unHide").onclick = () => { clearInterval(pl.upNextT); box.hidden = true; };
    if (auto) {
      const ring = $(".un-ring circle", box);
      if (ring) { ring.style.transition = "none"; ring.style.strokeDashoffset = "0"; requestAnimationFrame(() => { ring.style.transition = "stroke-dashoffset 10s linear"; ring.style.strokeDashoffset = "100.5"; }); }
      pl.upNextT = setInterval(() => {
        if (pl.v.paused) return;
        left -= 1;
        const el = $("#unLeft"); if (el) el.textContent = left;
        if (left <= 0) go();
      }, 1000);
    }
  }

  // Are you still watching: after the profile's set time with nobody touching anything it pauses and asks, so a
  // show doesnt autoplay all night to an empty room. Off unless the profile turns it on in Settings
  const STILL = { t: null };
  function stillReset() {
    clearTimeout(STILL.t);
    const mins = ME.profile && ME.profile.prefs && Number(ME.profile.prefs.still_watching);
    if (!mins || pl.el.hidden) return;
    STILL.t = setTimeout(stillAsk, mins * 60000);
  }
  function stillAsk() {
    if (pl.el.hidden || pl.v.paused) return stillReset();
    pl.v.pause();
    const box = $("#pStill");
    $("#stillWhat").textContent = $("#pTitle").textContent + ($("#pSub").textContent ? " · " + $("#pSub").textContent.split("  ").slice(0, 2).join(" ") : "");
    box.hidden = false;
    $("#stillYes").focus();
    // Nobody answers for 10 minutes, the player closes and saves where it got to
    STILL.t = setTimeout(() => { if (!box.hidden) closePlayer(); }, 600000);
  }
  $("#stillYes").onclick = () => { $("#pStill").hidden = true; pl.v.play().catch(() => {}); stillReset(); };
  $("#stillNo").onclick = () => { $("#pStill").hidden = true; closePlayer(); };
  // On the document so tv remotes count too, there key presses dont always land inside the player
  ["pointerdown", "keydown", "wheel"].forEach((ev) => document.addEventListener(ev, () => { if (!pl.el.hidden && $("#pStill").hidden) stillReset(); }, { passive: true }));
  let stillMove = 0;
  pl.el.addEventListener("mousemove", () => { if (Date.now() - stillMove > 5000 && $("#pStill").hidden) { stillMove = Date.now(); stillReset(); } });

  // controls
  const v = pl.v;
  function drawTime() {
    const d = total(), p = pos();
    $("#tNow").textContent = clock(p);
    $("#tLeft").textContent = "-" + clock(d - p);
    if (!pl.dragging && d) {
      $("#scrubFill").style.width = `${(p / d) * 100}%`;
      $("#scrubKnob").style.left = `${(p / d) * 100}%`;
    }
    let bufEnd = 0;
    if (v.buffered.length) bufEnd = v.buffered.end(v.buffered.length - 1) + (pl.mode === "hls" ? pl.offset : 0);
    if (d) $("#scrubBuf").style.width = `${Math.min(100, (bufEnd / d) * 100)}%`;
    $("#scrub").setAttribute("aria-valuemax", Math.round(d));
    $("#scrub").setAttribute("aria-valuenow", Math.round(p));
    $("#scrub").setAttribute("aria-valuetext", `${clock(p)} of ${clock(d)}`);
    renderSubs();
    checkIntro();
    checkUpNext();
  }
  v.addEventListener("timeupdate", drawTime);
  v.addEventListener("progress", drawTime);
  v.addEventListener("waiting", () => { if (!LOAD.on) spinner(true); });
  v.addEventListener("playing", () => {
    spinner(false); $("#pMsg").hidden = true; loadHide(); stillReset();
    if (pl.info && (!pl.evStarted || pl.evPaused)) { pl.evStarted = true; pl.evPaused = false; sendEvent("start"); }
  });
  v.addEventListener("canplay", () => spinner(false));
  const playIcon = () => { $("#pPlay").innerHTML = ic(v.paused ? "play" : "pause"); $("#pPlay").setAttribute("aria-label", v.paused ? "Play" : "Pause"); };
  v.addEventListener("play", playIcon);
  if (ANDROID) {
    v.addEventListener("playing", () => window.KinoAndroid.setPlaying(true));
    ["pause", "ended", "emptied"].forEach((ev) => v.addEventListener(ev, () => window.KinoAndroid.setPlaying(false)));
  }
  v.addEventListener("pause", () => {
    playIcon(); wakeUi();
    if (pl.info && pl.evStarted && !v.ended && v.currentSrc) { pl.evPaused = true; sendEvent("pause"); }
  });
  playIcon();
  v.addEventListener("ended", () => {
    if (pl.mode === "hls" && pos() < total() - 30) return;
    saveProgress();
    if (pl.info && pl.info.next && (!pl.info.prefs || pl.info.prefs.autoplay !== false)) {
      const n = pl.info.next;
      clearInterval(pl.upNextT);
      playNext(n);
      return;
    }
    closePlayer();
  });
  // Library episodes play straight away, public domain episodes need their archive.org copy looked up first
  function playNext(n) {
    if (n.video_id) return playEpisode(n.video_id, n).then((ok) => ok || closePlayer());
    playFile(n.id, { title: pl.title, from: 0 });
  }
  v.addEventListener("error", () => {
    if (pl.mode === "direct" && pl.info && !pl.info.stream) startHls(pos());  // If direct play fails the server converts it instead
  });

  const toggle = () => (v.paused ? v.play().catch(() => {}) : v.pause());
  $("#pPlay").onclick = toggle;
  $("#pBack").onclick = () => seekTo(pos() - 10);
  $("#pFwd").onclick = () => seekTo(pos() + 10);
  $("#pClose").onclick = () => closePlayer();
  $("#skipIntro").onclick = () => { if (pl.info && pl.info.intro) { pl.introSkipped = true; seekTo(pl.info.intro.end); $("#skipIntro").hidden = true; } };
  $("#pFull").onclick = () => {
    if (document.fullscreenElement) return document.exitFullscreen();
    if (pl.el.requestFullscreen) return pl.el.requestFullscreen();
    if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();  // iPhone only does fullscreen on the video itself
  };
  document.addEventListener("fullscreenchange", () => ($("#pFull").innerHTML = ic(document.fullscreenElement ? "exitfull" : "full")));
  $("#pMute").onclick = () => { v.muted = !v.muted; $("#pMute").innerHTML = ic(v.muted ? "mute" : "vol"); };
  $("#pVol").oninput = (e) => { v.volume = Number(e.target.value); v.muted = v.volume === 0; $("#pMute").innerHTML = ic(v.muted ? "mute" : "vol"); };
  const menuBtn = (btn, menu) => ($(btn).onclick = (e) => { e.stopPropagation(); const m = $(menu); const was = m.hidden; hideMenus(); m.hidden = !was; });
  menuBtn("#pAudio", "#mAudio"); menuBtn("#pSubs", "#mSubs"); menuBtn("#pSpeed", "#mSpeed"); menuBtn("#pAdminIntro", "#mIntro");
  $("#pAdminIntro").innerHTML = ic("flag");
  pl.el.addEventListener("click", (e) => {
    if (!e.target.closest(".menu-wrap")) hideMenus();
    if (e.target === v || e.target.id === "playerUi") toggle();
  });
  v.addEventListener("dblclick", () => $("#pFull").click());

  // scrubbing
  const scrub = $("#scrub");
  const frac = (e) => { const r = scrub.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
  scrub.addEventListener("pointerdown", (e) => {
    pl.dragging = true; scrub.classList.add("drag"); scrub.setPointerCapture(e.pointerId);
    const f = frac(e); $("#scrubFill").style.width = $("#scrubKnob").style.left = `${f * 100}%`;
  });
  scrub.addEventListener("pointermove", (e) => {
    const f = frac(e), tip = $("#scrubTip");
    tip.hidden = false; tip.style.left = `${f * 100}%`; tip.textContent = clock(f * total());
    if (pl.dragging) $("#scrubFill").style.width = $("#scrubKnob").style.left = `${f * 100}%`;
  });
  scrub.addEventListener("pointerleave", () => ($("#scrubTip").hidden = true));
  scrub.addEventListener("pointerup", (e) => {
    if (!pl.dragging) return;
    pl.dragging = false; scrub.classList.remove("drag");
    seekTo(frac(e) * total());
  });
  scrub.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { seekTo(pos() - 10); e.preventDefault(); }
    if (e.key === "ArrowRight") { seekTo(pos() + 10); e.preventDefault(); }
  });

  function wakeUi() {
    pl.el.classList.remove("idle");
    clearTimeout(pl.idleT);
    pl.idleT = setTimeout(() => { if (!v.paused && !pl.dragging && $$(".player .menu").every((m) => m.hidden)) pl.el.classList.add("idle"); }, 3000);
  }
  ["mousemove", "pointerdown", "keydown"].forEach((ev) => pl.el.addEventListener(ev, wakeUi));

  document.addEventListener("keydown", (e) => {
    if (pl.el.hidden || e.target.tagName === "INPUT" || sheetClose) return;
    const onControl = TV && e.target.closest && e.target.closest(".player-row, .menu, .up-next, .player-top, .skip-intro");
    if ((e.key === " " || e.key === "k") && !onControl) { e.preventDefault(); toggle(); }
    else if (e.key === "ArrowLeft" && e.target !== scrub && !onControl) seekTo(pos() - 10);
    else if (e.key === "ArrowRight" && e.target !== scrub && !onControl) seekTo(pos() + 10);
    else if (e.key === "f") $("#pFull").click();
    else if (e.key === "m") $("#pMute").click();
    else if (e.key === "s" && !$("#skipIntro").hidden) $("#skipIntro").click();
    else if (e.key === "Escape" && !document.fullscreenElement) closePlayer();
  });
  window.addEventListener("pagehide", saveProgress);

  // ---------------------------------------------------------- android app and tv remotes
  // The android app adds KinoAndroid to the user agent and gives the page a small bridge. On tvs (KinoTV) the
  // remote's arrows move focus around the page like on apple tv, the browser itself cant do that
  function nav(e) {
    const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const d = dirs[e.key];
    if (!d || e.altKey || e.ctrlKey || e.metaKey) return;
    const cur = document.activeElement;
    if (cur && cur.matches("input[type=search], input[type=text], input:not([type])") && d[0] && cur.value) return;  // moving the text cursor
    if (cur && cur.tagName === "SELECT") return;
    if (cur && cur.id === "scrub" && d[0]) return;   // the timeline seeks with left and right
    const playerOpen = !pl.el.hidden;
    if (playerOpen && (!cur || !pl.el.contains(cur) || cur === pl.v) && d[0]) return;  // left and right seek
    // An open dropdown keeps the remote inside it until it's closed, otherwise down could land on the page behind it
    const openMenu = cur && cur.closest && cur.closest(".menu:not([hidden])");
    const scope = sheetClose ? $(".sheet-wrap") : openMenu || (playerOpen ? pl.el : document);
    if (playerOpen) wakeUi();
    const items = $$('a[href], button, input, select, [tabindex]:not([tabindex="-1"])', scope).filter((el) => {
      if (el.disabled || el.closest("[hidden]") || el.closest('[aria-hidden="true"]') || el.closest(".hero-dots")) return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== "hidden";
    });
    if (!items.length) return;
    e.preventDefault();
    if (!cur || cur === document.body || !scope.contains(cur)) {
      const first = (playerOpen && $("#pPlay")) || $("[data-heroplay], [data-heroresume], .hero-slide.on .btn.primary, #pdPlay, #playMain", scope) || items.find((el) => !el.closest("#chrome")) || items[0];
      first.focus({ preventScroll: false });
      return;
    }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    // The sidebar is its own column: up and down stay inside it, and things tucked behind it aren't targets
    const side = $("#side"), inSide = !!(side && side.contains(cur));
    const sideRight = side && !playerOpen && !sheetClose ? side.getBoundingClientRect().right : -1;
    // Right at the end of a row stays put instead of jumping up into whatever row is above
    const curRow = d[0] > 0 && cur.closest && cur.closest(".row, .episodes, .chips");
    let best = null, bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      if (curRow && !curRow.contains(el)) continue;
      const elSide = !!(side && side.contains(el));
      if (d[1] && elSide !== inSide) continue;
      if (d[0] > 0 && inSide && elSide) continue;
      if (!elSide && scope === document) { const r = el.getBoundingClientRect(); if (r.left + r.width / 2 < sideRight) continue; }
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const main = d[0] ? (bx - ax) * d[0] : (by - ay) * d[1];
      if (main <= 4) continue;
      // Edges overlapping in the other direction count as in line, so rows and columns feel natural
      const cross = d[0] ? Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)) ? Math.abs(by - ay) : 0
                         : Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right)) ? Math.abs(bx - ax) : 0;
      const score = main + cross * 3;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) {
      best.focus({ preventScroll: true });
      best.scrollIntoView({ block: d[1] ? "center" : "nearest", inline: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
    }
  }
  if (TV) {
    document.body.classList.add("tv");
    document.addEventListener("keydown", nav, true);
  }
  // Back on a remote or phone closes whatever is on top first, the app goes back a page when this says no
  window.kinoBack = () => {
    const menu = $$(".player .menu").find((m) => !m.hidden);
    if (menu) { hideMenus(); return true; }
    if (sheetClose) { closeSheet(); return true; }
    if (!$("#pStill").hidden) { $("#stillYes").click(); return true; }
    if (!pl.el.hidden) { closePlayer(); return true; }
    const am = $("#avatarMenu");
    if (am && !am.hidden) { am.hidden = true; $("#side").classList.remove("pinned"); $("#avatarBtn").focus(); return true; }
    const page = (location.hash || "#/home").split("?")[0].split("/")[1] || "home";
    if (page === "title" || page === "discover" || page === "person") { history.length > 1 ? history.back() : (location.hash = "#/home"); return true; }
    if (page !== "home" && page !== "profiles") { location.hash = "#/home"; return true; }
    if (TV && document.activeElement && !document.activeElement.closest("#chrome") && $("#side")) {
      // On a tv, back on Home jumps to the sidebar like apple tv, and from there it leaves
      const cur = $(".side-item[aria-current='page']") || $(".side-item");
      if (cur) { cur.focus(); return true; }
    }
    return false;
  };
  window.kinoMedia = (cmd) => {
    if (pl.el.hidden) return;
    wakeUi();
    if (cmd === "playpause") toggle();
    else if (cmd === "play") pl.v.play().catch(() => {});
    else if (cmd === "pause") pl.v.pause();
    else if (cmd === "forward") seekTo(pos() + 10);
    else if (cmd === "back") seekTo(pos() - 10);
    else if (cmd === "stop") closePlayer();
  };
  window.kinoPip = (on) => document.body.classList.toggle("pip", !!on);

  // ---------------------------------------------------------- side scrolling rows
  // A mouse without a trackpad cant scroll sideways, so rows get arrow buttons like netflix when you point at them.
  // The mouse wheel also scrolls a row sideways while the pointer is over its arrows. Touch screens and tvs dont get them
  const FINE = matchMedia("(hover: hover) and (pointer: fine)");
  function enhanceRows(root = app) {
    if (TV || !FINE.matches) return;
    $$(".row, .episodes", root).forEach((row) => {
      if (row.parentElement.classList.contains("row-wrap")) return;
      const wrap = document.createElement("div");
      wrap.className = "row-wrap";
      row.parentNode.insertBefore(wrap, row);
      wrap.appendChild(row);
      wrap.insertAdjacentHTML("beforeend", `<button class="row-arrow l" tabindex="-1" aria-label="Scroll left">${ic("chevronL")}</button><button class="row-arrow r" tabindex="-1" aria-label="Scroll right">${ic("chevronR")}</button>`);
      const [l, r] = $$(".row-arrow", wrap);
      const upd = () => {
        const max = row.scrollWidth - row.clientWidth - 4;
        l.classList.toggle("off", row.scrollLeft <= 4 || row.classList.contains("grid"));
        r.classList.toggle("off", row.scrollLeft >= max || row.classList.contains("grid"));
      };
      // Moves by whole tiles so nothing ends up cut in half at the edge
      const step = (dir) => {
        const tile = row.firstElementChild;
        const w = tile ? tile.getBoundingClientRect().width + parseFloat(getComputedStyle(row).columnGap || 18) : 300;
        const n = Math.max(1, Math.floor((row.clientWidth - 80) / w));
        row.scrollBy({ left: dir * n * w, behavior: reduceMotion() ? "auto" : "smooth" });
      };
      l.onclick = (e) => { e.preventDefault(); step(-1); };
      r.onclick = (e) => { e.preventDefault(); step(1); };
      [l, r].forEach((b) => b.addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); row.scrollBy({ left: e.deltaY }); } }, { passive: false }));
      row.addEventListener("scroll", upd, { passive: true });
      wrap.addEventListener("mouseenter", upd);
      upd();
    });
  }

  // ---------------------------------------------------------- router
  const applyPrefs = () => document.body.classList.toggle("blur-watched", !!(ME.profile && ME.profile.prefs && ME.profile.prefs.blur_watched));

  // Which sidebar item a page belongs to
  const sideFor = (page) => ({ title: "", discover: "", person: "search" })[page] ?? (page || "home");
  let LAST_PAGE = null, ROUTE_N = 0, ENTER_T = null;

  // Apple style placeholders that show the shape of the page while it loads
  function skeleton(page) {
    const tiles = (n, cls = "sk-poster") => Array.from({ length: n }, () => `<div class="sk ${cls}"></div>`).join("");
    const row = (cls, n) => `<section class="shelf"><div class="sk sk-line" style="width:180px"></div><div class="row posters">${tiles(n, cls)}</div></section>`;
    if (page === "home" || !page) return `<div class="sk sk-hero"></div><main class="page under-hero">${row("sk-wide", 4)}${row("sk-poster", 7)}</main>`;
    if (page === "title" || page === "discover") return `<div class="sk sk-hero short"></div><main class="page under-hero">${row("sk-wide", 4)}</main>`;
    if (page === "settings" || page === "sync" || page === "server") return `<main class="page narrow"><div class="sk sk-title"></div><div class="sk sk-card"></div><div class="sk sk-card"></div></main>`;
    if (page === "search") return `<main class="page"><div class="sk sk-search"></div><div class="sk sk-line" style="width:200px;margin-top:32px"></div><div class="grid">${tiles(12)}</div></main>`;
    return `<main class="page"><div class="sk sk-title"></div><div class="grid">${tiles(14)}</div></main>`;
  }

  async function route() {
    stopPoll();
    clearInterval(HERO_T);
    closeSheet();
    const [, page, arg] = (location.hash || "#/").split("?")[0].split("/");
    const n = ++ROUTE_N;
    const changed = (location.hash.split("?")[0]) !== LAST_PAGE;
    try {
      if (!ME.profile || page === "profiles" || !page) {
        if (!ME.profile && page !== "profiles") {
          const me = await api("/api/me");
          ME.profile = me.profile; ME.admin = me.admin; ME.ip = me.ip;
        }
        if (!ME.profile || page === "profiles") { document.body.classList.remove("with-side"); LAST_PAGE = null; return pageProfiles(false); }
        if (!page) { location.hash = "#/home"; return; }
      }
      applyPrefs();
      // The sidebar stays and the page swaps to a skeleton straight away, so nothing jumps while it loads
      topbar(sideFor(page));
      document.body.classList.add("with-side");
      if (changed) { app.innerHTML = skeleton(page); app.classList.remove("enter"); window.scrollTo(0, 0); }
      if (page === "movies") await pageBrowse("movie");
      else if (page === "shows") await pageBrowse("series");
      else if (page === "title" && arg) await pageTitle(arg);
      else if (page === "discover" && arg) await pageDiscover(decodeURIComponent(arg), decodeURIComponent((location.hash.split("?")[0].split("/")[3] || "")));
      else if (page === "search") await pageSearch();
      else if (page === "person" && arg) await pagePerson(decodeURIComponent(arg));
      else if (page === "mylist") await pageMyList();
      else if (page === "settings") await pageSettings();
      else if (page === "sync" && isAdmin()) await pageSync();
      else if (page === "server" && isAdmin()) await pageServer();
      else await pageHome();
      if (isAdmin() && page !== "sync" && page !== "home") api("/api/admin/sync").then((s) => { SYNC = s; updateSyncChip(); }).catch(() => {});
      if (n === ROUTE_N) enhanceRows(app);
      if (changed && n === ROUTE_N) {
        void app.offsetWidth; app.classList.add("enter");
        // Only the first draw of a page animates, pages that refresh themselves every few seconds stay still
        clearTimeout(ENTER_T); ENTER_T = setTimeout(() => app.classList.remove("enter"), 900);
        // On a tv the remote lands on the page's main button after picking something in the sidebar
        if (TV) {
          const el = $(".hero-slide.on [data-heroresume], .hero-slide.on [data-heroplay], #playMain, #sq, .tile, main button, main a[href]", app);
          if (el) el.focus({ preventScroll: true });
          const side = $("#side"); if (side) side.classList.remove("open");
        }
      }
      LAST_PAGE = location.hash.split("?")[0];
    } catch (e) {
      if (e.message === "pick profile") return;
      if (e.status === 403 && /allow list/.test(e.message)) {
        location.href = "/gate";
        return;
      }
      app.innerHTML = (ME.profile ? topbar("") : "") + `<main class="page"><div class="empty"><h2>Something went wrong</h2><p>${esc(e.message)}</p>
        <a class="btn secondary small" href="#/home">Go Home</a></div></main>`;
      if (ME.profile) wireTopbar();
    }
  }
  window.addEventListener("hashchange", route);
  route();

  // Installable app, the service worker only caches the app shell, never videos or api calls
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
})();
