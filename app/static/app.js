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
    link: "M3.9 12c0-1.7 1.4-3.1 3.1-3.1h4V7H7c-2.8 0-5 2.2-5 5s2.2 5 5 5h4v-1.9H7c-1.7 0-3.1-1.4-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.7 0 3.1 1.4 3.1 3.1s-1.4 3.1-3.1 3.1h-4V17h4c2.8 0 5-2.2 5-5s-2.2-5-5-5z",
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
    clock: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 110 16 8 8 0 010-16zm-1 3v5.4l4.3 2.6 1-1.7-3.3-2V7z",
    person: "M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0 2c-4.4 0-8 2.5-8 5.5V21h16v-1.5c0-3-3.6-5.5-8-5.5z",
    chevronR: "M9.2 6.6L13.8 11.2 9.2 15.8 10.6 17.2l6-6-6-6z",
    chevronL: "M14.8 6.6L10.2 11.2l4.6 4.6-1.4 1.4-6-6 6-6z",
    live: "M21 6h-7.6l3.3-3.3-.7-.7L12 6 8 2l-.7.7L10.6 6H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V8a2 2 0 00-2-2zm0 14H3V8h18zM9 10v8l7-4z",
    guide: "M3 4h18v2H3zm0 4h5v5H3zm7 0h11v5H10zm-7 7h9v5H3zm11 0h7v5h-7z",
    video: "M4 6h12a2 2 0 012 2v1.5l4-2.5v10l-4-2.5V16a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z",
    puzzle: "M20.5 11H19V7a2 2 0 00-2-2h-4V3.5a2.5 2.5 0 00-5 0V5H4a2 2 0 00-2 2v3.8h1.5a2.7 2.7 0 010 5.4H2V20a2 2 0 002 2h3.8v-1.5a2.7 2.7 0 015.4 0V22H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 000-5z",
    trailer: "M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zM10 8.5v7l6-3.5z",
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
    ["Pizza", "#ff9966", "#ff5e62", '<path d="M12 17c13-6.5 27-6.5 40 0L32 56z" fill="#fff"/><path d="M12 17c13-6.5 27-6.5 40 0l-2.6 5.6c-11.6-5.2-23.2-5.2-34.8 0z" fill="#ffd166"/><circle cx="27" cy="30" r="3.6" fill="#ff5e62"/><circle cx="37.5" cy="34" r="3.6" fill="#ff5e62"/><circle cx="31" cy="42" r="3.2" fill="#ff5e62"/>'],
    ["Robot", "#43cea2", "#185a9d", '<rect x="16" y="20" width="32" height="28" rx="7" fill="#fff"/><rect x="30" y="11" width="4" height="9" fill="#fff"/><circle cx="32" cy="10" r="3.5" fill="#fff"/><circle cx="25" cy="32" r="4" fill="#185a9d"/><circle cx="39" cy="32" r="4" fill="#185a9d"/><rect x="25" y="40" width="14" height="3" rx="1.5" fill="#185a9d"/><rect x="10" y="28" width="4" height="12" rx="2" fill="#fff"/><rect x="50" y="28" width="4" height="12" rx="2" fill="#fff"/>'],
    ["Heart", "#ff416c", "#ff4b2b", '<path d="M32 53S10 39.5 10 24.5A11.5 11.5 0 0132 18a11.5 11.5 0 0122 6.5C54 39.5 32 53 32 53z" fill="#fff"/>'],
    ["Diamond", "#00c6ff", "#0072ff", '<path d="M20 14h24l10 12-22 26L10 26z" fill="#fff"/><path d="M10 26h44M24 14l-4 12 12 26 12-26-4-12" stroke="#0072ff" stroke-width="2.2" fill="none" stroke-linejoin="round" opacity=".55"/>'],
    ["Sun", "#f7b733", "#fc4a1a", '<circle cx="32" cy="32" r="11" fill="#fff"/><path d="M32 9v7M32 48v7M9 32h7M48 32h7M15.7 15.7l5 5M43.3 43.3l5 5M15.7 48.3l5-5M43.3 20.7l5-5" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'],
    ["Cloud", "#89f7fe", "#66a6ff", '<path d="M20 47a10 10 0 01-1.2-19.9A14 14 0 0146 23.5 11.5 11.5 0 0147 47z" fill="#fff"/>'],
    ["Camera", "#606c88", "#3f4c6b", '<rect x="10" y="20" width="44" height="30" rx="6" fill="#fff"/><path d="M24 21l3-7h10l3 7z" fill="#fff"/><circle cx="32" cy="35" r="9" fill="#3f4c6b"/><circle cx="32" cy="35" r="4.6" fill="#fff"/>'],
    ["Ticket", "#f7971e", "#ffd200", '<path d="M10 20h44v8a4 4 0 000 8v8H10v-8a4 4 0 000-8z" fill="#fff"/><path d="M40 22v20" stroke="#f7971e" stroke-width="2.6" stroke-dasharray="3 3"/>'],
    ["Football", "#11998e", "#0f9b0f", '<circle cx="32" cy="32" r="21" fill="#fff"/><path d="M32 23.5l8 5.8-3 9.4H27l-3-9.4z" fill="#222"/><path d="M32 23.5V12M40 29.3l10.5-3.4M37 38.7l6.5 9M27 38.7l-6.5 9M24 29.3l-10.5-3.4" stroke="#222" stroke-width="2.4"/>'],
    ["Headphones", "#7f00ff", "#e100ff", '<path d="M14 40v-6a18 18 0 0136 0v6" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><rect x="10" y="36" width="11" height="17" rx="4" fill="#fff"/><rect x="43" y="36" width="11" height="17" rx="4" fill="#fff"/>'],
    ["Paw", "#c79081", "#a0522d", '<ellipse cx="32" cy="42" rx="11" ry="9" fill="#fff"/><ellipse cx="18" cy="30" rx="5" ry="6.5" fill="#fff"/><ellipse cx="46" cy="30" rx="5" ry="6.5" fill="#fff"/><ellipse cx="25" cy="19" rx="5" ry="6.5" fill="#fff"/><ellipse cx="39" cy="19" rx="5" ry="6.5" fill="#fff"/>'],
    ["Rainbow", "#a18cd1", "#fb8ad1", '<path d="M10 46a22 22 0 0144 0" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/><path d="M18 46a14 14 0 0128 0" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" opacity=".75"/><path d="M26 46a6 6 0 0112 0" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" opacity=".5"/>'],
    ["Coffee", "#603813", "#b29f94", '<path d="M14 25h30v13a12 12 0 01-12 12h-6a12 12 0 01-12-12z" fill="#fff"/><path d="M44 29h3a6 6 0 010 12h-4" fill="none" stroke="#fff" stroke-width="4"/><path d="M22 10c-2 3 2 5 0 8M30 10c-2 3 2 5 0 8M38 10c-2 3 2 5 0 8" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/>'],
    ["Ice Cream", "#f857a6", "#ff5858", '<path d="M22 33h20L32 57z" fill="#ffd8a8"/><circle cx="32" cy="22" r="11" fill="#fff"/><circle cx="23.5" cy="29.5" r="6.5" fill="#fff"/><circle cx="40.5" cy="29.5" r="6.5" fill="#fff"/>'],
    ["Skull", "#434343", "#000000", '<path d="M32 10c-12 0-20 8-20 19 0 6 3 10 7 12v7h26v-7c4-2 7-6 7-12 0-11-8-19-20-19z" fill="#fff"/><circle cx="24.5" cy="30" r="5" fill="#222"/><circle cx="39.5" cy="30" r="5" fill="#222"/><path d="M30 38h4l-2 4z" fill="#222"/><path d="M26.5 48v5M32 48v5M37.5 48v5" stroke="#222" stroke-width="2.4"/>'],
    ["Fish", "#36d1dc", "#5b86e5", '<path d="M8 32c8-12 24-14 36-4l10-8v24l-10-8C32 46 16 44 8 32z" fill="#fff"/><circle cx="20" cy="30" r="2.8" fill="#5b86e5"/>'],
    ["Panda", "#2c3e50", "#4ca1af", '<circle cx="17" cy="18" r="7" fill="#fff"/><circle cx="47" cy="18" r="7" fill="#fff"/><circle cx="32" cy="35" r="19" fill="#fff"/><ellipse cx="25" cy="33" rx="4" ry="5" fill="#333"/><ellipse cx="39" cy="33" rx="4" ry="5" fill="#333"/><ellipse cx="32" cy="43" rx="4" ry="3" fill="#333"/>'],
    ["Trophy", "#f09819", "#edde5d", '<path d="M20 10h24v12a12 12 0 01-24 0z" fill="#fff"/><path d="M20 14h-6a7 7 0 007 10M44 14h6a7 7 0 01-7 10" fill="none" stroke="#fff" stroke-width="3.5"/><rect x="29" y="33" width="6" height="10" fill="#fff"/><rect x="20" y="43" width="24" height="8" rx="2" fill="#fff"/>'],
  ];
  // Picture icons are "img|url" (posters and memes) or "logo|slug|hex" (brand logos from simple-icons)
  const LOGO_BASE = "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/";
  const lightHex = (h) => { const n = parseInt(h, 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 165; };
  const darker = (h) => { const n = parseInt(h, 16); const d = (v) => Math.round(v * 0.62).toString(16).padStart(2, "0"); return d(n >> 16) + d((n >> 8) & 255) + d(n & 255); };
  function avParts(p) {
    const v = (p && p.image) || "";
    if (v.startsWith("logo|")) {
      const [, slug, hx] = v.split("|");
      return { cls: `av-logo ${lightHex(hx) ? "light" : ""}`, style: `--a:#${hx};--b:#${darker(hx)}`, html: `<img src="${img(LOGO_BASE + slug + ".svg")}" alt="" loading="lazy" data-fallback="hide">` };
    }
    if (v.startsWith("img|")) return { cls: "av-img", style: "", html: `<img src="${img(v.slice(4), 0, 240)}" alt="" loading="lazy" data-fallback="hide">` };
    const a = AV[p ? p.icon : 0] || AV[0];
    return { cls: "", style: `--a:${a[1]};--b:${a[2]}`, html: `<svg viewBox="0 0 64 64">${a[3]}</svg>` };
  }
  // A profiles icon. Joint profiles without there own picture show both peoples icons overlapping
  function pav(p, cls = "") {
    if (p && !p.image && p.members && p.members.length > 1) {
      return `<span class="av av-duo ${cls}" aria-hidden="true">${p.members.slice(0, 2).map((m) => { const x = avParts(m); return `<span class="av-half ${x.cls}" style="${x.style}">${x.html}</span>`; }).join("")}</span>`;
    }
    const x = avParts(p);
    return `<span class="av ${cls} ${x.cls}" style="${x.style}" aria-hidden="true">${x.html}</span>`;
  }
  const avatar = (i, cls = "") => pav({ icon: i }, cls);

  // ---------------------------------------------------------- helpers
  const $ = (s, r = document) => r.querySelector(s);
  // Set when running inside the kino android app, and on android tv / fire tv
  const ANDROID = /KinoAndroid/.test(navigator.userAgent) && !!window.KinoAndroid;
  const TV = /KinoTV/.test(navigator.userAgent) || /[?&]tv=1/.test(location.search);
  // Added to the home screen it is an app, so pinch and double tap zoom are switched off like in the Android app. In a normal browser
  // tab pinching still works, zooming is a real need there. Safari ignores user-scalable=no a lot of the time so it also stops its
  // own gesture events and any two finger move
  const STANDALONE = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  if (STANDALONE) {
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp && !/user-scalable/.test(vp.content)) vp.content += ", maximum-scale=1, user-scalable=no";
    document.documentElement.classList.add("standalone");
    for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(t, (e) => e.preventDefault(), { passive: false });
    document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  }
  // Pictures and video cant be dragged out of the page onto the desktop, and right click on them has no save menu. This only stops the
  // easy ways, anyone can still take a screenshot or look at what the page loads. Text boxes and links keep their own right click
  document.addEventListener("dragstart", (e) => { if (e.target.closest && e.target.closest("img, picture, video, canvas, svg, a")) e.preventDefault(); }, true);
  document.addEventListener("contextmenu", (e) => { if (e.target.closest && e.target.closest("img, picture, video, canvas, .tile, .hero, .detail-hero, .player")) e.preventDefault(); }, true);
  // With the drag gone, letting go of a poster that was dragged on counts as a click and opens it, so a mouse click that moved a fair way is ignored
  let mDown = null;
  document.addEventListener("pointerdown", (e) => { mDown = e.pointerType === "mouse" ? [e.clientX, e.clientY] : null; }, true);
  document.addEventListener("click", (e) => { if (mDown && Math.hypot(e.clientX - mDown[0], e.clientY - mDown[1]) > 8 && e.target.closest && e.target.closest("a.tile, .tile, .hero")) { e.preventDefault(); e.stopPropagation(); } mDown = null; }, true);
  // TVs and low memory devices get a lighter version: smaller pictures, no glass blur, fewer effects. Everything else is untouched
  const LITE = TV || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  if (LITE) document.documentElement.classList.add("lite");
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $("#app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Hashes come from the address bar so they can hold broken percent codes, this never throws
  const safeDecode = (x) => { try { return decodeURIComponent(x); } catch (_) { return x; } };
  // w asks the server for a smaller copy, full size pictures are only used for the big hero
  const img = (u, trim, w) => (u ? "/api/img?u=" + encodeURIComponent(u) + (trim ? "&trim=1" : "") + (w ? "&w=" + w : "") : "");
  // Tvs get smaller copies again, they hold every picture in memory and run out much sooner than a computer
  const PW = () => (LITE ? 240 : 342), WW = () => (LITE ? 480 : 640), LW = () => (LITE ? 640 : 0);
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

  // Gives up after 20 seconds so a stalled connection cant leave a page on its skeleton for ever, sig is an optional abort from the caller
  async function api(url, body, method, sig) {
    const opt = { method: method || (body !== undefined ? "POST" : "GET"), headers: { "X-Kino": "1" }, credentials: "same-origin" };
    if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    // Starting a stream, asking addons and making a backup can take a while, so those get longer
    const slow = /^\/api\/(play\/|streams\/|admin\/(backups|stress))/.test(url);
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), slow ? 90000 : 20000);
    if (sig) { if (sig.aborted) ac.abort(); else sig.addEventListener("abort", () => ac.abort(), { once: true }); }
    opt.signal = ac.signal;
    let r, j = null;
    try {
      r = await fetch(url, opt);
      try { j = await r.json(); } catch (_) {}
    } catch (e) {
      if (e.name === "AbortError" && !(sig && sig.aborted)) { const te = new Error("The server took too long to answer"); te.status = 0; throw te; }
      throw e;
    } finally { clearTimeout(tm); }
    if (r.status === 409) { ME.profile = null; location.hash = "#/profiles"; throw new Error("pick profile"); }
    if (r.status === 401 && url.startsWith("/api/admin/") && !url.endsWith("/login")) {
      ME.admin = null;
      throw new Error((j && j.detail) || "Sign in as admin to do that");
    }
    if (!r.ok) { const e = new Error((j && j.detail) || (r.status >= 500 ? `The server couldn't open that (error ${r.status})` : `Request failed (${r.status})`)); e.status = r.status; throw e; }
    if (r.status === 202) return { ...j, _pending: true };
    return j;
  }

  // Anything that throws without being caught ends up as a short message instead of nothing happening
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason, m = r && r.message;
    if (!m || m === "pick profile" || (r && r.name === "AbortError")) return;
    console.warn(r);
    toast(m.length > 90 ? "Something went wrong" : m, 5000);
  });

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
    else if (el.dataset.fallback === "initials") {
      // A channel logo that wouldn't load: the first letters of the name instead
      const b = document.createElement("b");
      b.className = "ch-ph"; b.textContent = el.dataset.ini || "";
      el.replaceWith(b);
    }
    else if (el.dataset.fallback === "ph") {
      const d = document.createElement("div");
      d.className = "ph"; d.style.setProperty("--h", hue(el.alt)); d.textContent = el.alt;
      el.replaceWith(d);
    }
  }, true);

  // ---------------------------------------------------------- sheets, the in app popups (no browser alerts)
  let sheetClose = null;
  // stack opens on top of a sheet thats already open (a tv dropdown inside Fix Match) instead of closing it
  function sheet(html, { wide = false, onClose, stack = false } = {}) {
    const under = stack ? sheetClose : null;
    if (!stack) closeSheet();
    const wrap = document.createElement("div");
    wrap.className = "sheet-wrap";
    wrap.innerHTML = `<div class="sheet ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap);
    const prev = document.activeElement;
    const close = () => {
      wrap.remove(); sheetClose = under; document.removeEventListener("keydown", onKey);
      if (prev && prev.focus) {
        prev.focus();
        // Opened from a menu thats shut now, the button that opened the menu gets it instead
        const mw = document.activeElement !== prev && prev.closest && prev.closest(".menu-wrap");
        if (mw) { const b = $("button", mw); if (b) b.focus(); }
      }
      onClose && onClose();
    };
    // Only the top one closes on escape or back
    const onKey = (e) => { if (e.key === "Escape" && $$(".sheet-wrap").pop() === wrap) close(); };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("mousedown", (e) => { if (e.target === wrap) close(); });
    $$("[data-close]", wrap).forEach((b) => (b.onclick = close));
    sheetClose = close;
    const f = wrap.querySelector("input, button:not([data-close]), select");
    if (f) setTimeout(() => f.focus(), 30);
    return { el: wrap.firstElementChild, close };
  }
  const closeSheet = () => sheetClose && sheetClose();

  // Taking something out of Continue Watching on a tv: hold OK on the card (or press the remotes menu button), like the
  // streaming apps do. A quick press still plays it
  if (TV) {
    let hold = null, sheetAt = 0;
    const cwSheet = (el) => {
      sheetAt = Date.now();
      const sh = sheet(`<h2>${esc(el.dataset.cwname || "This")}</h2><p class="secondary">Remove it from Continue Watching? It comes back if you start watching it again.</p>
        <div class="actions end"><button class="btn secondary" id="cwNo">Cancel</button><button class="btn primary" id="cwYes">Remove</button></div>`);
      const no = $("#cwNo", sh.el); no.onclick = sh.close;
      setTimeout(() => no.focus(), 60);
      $("#cwYes", sh.el).onclick = async () => {
        sh.close();
        await api("/api/continue/hide", { file_id: el.dataset.cw }).catch(() => {});
        toast("Removed from Continue Watching");
        route();
      };
    };
    document.addEventListener("keydown", (e) => {
      // The key you are still holding when the sheet opens keeps repeating, it must not press a button in it
      if (e.key === "Enter" && e.repeat && Date.now() - sheetAt < 900) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      const el = !sheetClose && e.target.closest && e.target.closest("[data-cw]");
      if (!el) return;
      if (e.key === "ContextMenu") { e.preventDefault(); return cwSheet(el); }
      if (e.key !== "Enter") return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.repeat || hold) return;
      hold = { el, fired: false, t: setTimeout(() => { hold.fired = true; cwSheet(el); }, 550) };
    }, true);
    document.addEventListener("keyup", (e) => {
      if (e.key !== "Enter" || !hold) return;
      const h = hold; hold = null; clearTimeout(h.t);
      if (!h.fired && document.contains(h.el)) h.el.click();
    }, true);
  }

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
  let POLL = null, SYNC = null, HERO_T = null, SCAN_T = null, FAV_T = null, FAV_PV = null;

  // hls.js is big and only the player needs it, so it gets fetched the first time something plays (once, then its cached)
  let HLS_P = null;
  const loadHls = () => {
    if (window.Hls) return Promise.resolve();
    if (HLS_P) return HLS_P;
    return (HLS_P = new Promise((ok, no) => {
      const sc = document.createElement("script");
      sc.src = "/static/hls.min.js";
      sc.onload = () => ok();
      sc.onerror = () => { HLS_P = null; sc.remove(); no(new Error("Couldn't load the video player")); };
      document.head.appendChild(sc);
    }));
  };
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
    const key = [p.id, p.name, p.icon, p.kids, isAdmin(), JSON.stringify(ME.features || {})].join("|");
    if (key !== SIDE_KEY) { SIDE_KEY = key; renderSide(); }
    setActive(active);
    return "";
  }

  function renderSide() {
    const p = ME.profile;
    let open = false;
    try { open = localStorage.getItem(GROUP_KEY) === "1"; } catch (_) {}
    const item = (k, label, icon, extra = "") => `<a class="side-item" href="#/${k}" data-k="${k}"><span class="side-ic">${ic(icon)}</span><span class="side-lbl">${label}</span>${extra}</a>`;
    const F = ME.features || {};
    const main = [["search", "Search", "search"], ["home", "Home", "home"], ["movies", "Movies", "film"], ["shows", "TV Shows", "tv"],
      ...(F.live ? [["live", "Live TV", "live"]] : []), ["mylist", "My List", "bookmark"]];
    const group = [["settings", "Settings", "gear"], ["history", "History", "clock"]];
    if (isAdmin()) group.push(["sync", "Sync", "refresh"], ["server", "Server", "server"]);
    chrome.innerHTML = `<aside class="side" id="side" aria-label="Kino">
      <span class="side-shine" aria-hidden="true"></span>
      <div class="menu-wrap side-top">
        <button class="side-me" id="avatarBtn" aria-haspopup="true" aria-label="Profile menu">${pav(p, "xs")}<span class="side-lbl side-name">${esc(p.name)}</span><span class="side-lbl side-time" id="sideTime">${clockNow()}</span></button>
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
      ${[["home", "Home", "home"], ["movies", "Movies", "film"], ["shows", "TV Shows", "tv"], ...(F.live ? [["live", "Live", "live"]] : []), ["search", "Search", "search"]].map(([k, l, i]) =>
        `<a class="tb-item" href="#/${k}" data-k="${k}">${ic(i)}<span>${l}</span></a>`).join("")}
      <button class="tb-item" id="tbMore" data-k="more">${pav(p, "xs")}<span>${esc(p.name)}</span></button>
    </nav>`;
    wireSide();
  }

  // Moves the highlight pill to the current page with a spring, like the selection on apple tv
  function setActive(active) {
    SIDE_ACTIVE = active;
    const inGroup = ["settings", "history", "sync", "server"].includes(active);
    if (inGroup) { const g = $("#sideGroup"); if (g && !g.classList.contains("open")) toggleGroup(true, false); }
    $$("#chrome [data-k]").forEach((a) => {
      const on = a.dataset.k === active || (a.dataset.k === "more" && ["mylist", "settings", "history", "sync", "server"].includes(active));
      on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
    });
    placePill();
  }
  function placePill(instant) {
    const pill = $("#sidePill"), cur = $(`.side-item[aria-current="page"]`);
    if (!pill) return;
    // The page is in the Settings group but the group is folded away: no pill (it showed as a blank white shape),
    // the Settings heading gets highlighted instead
    const folded = !!(cur && cur.closest(".side-group:not(.open)"));
    const head = $("#sideHead"); if (head) head.classList.toggle("holds-current", folded);
    if (!cur || !cur.offsetParent || folded) { pill.style.opacity = "0"; return; }
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
    // Tapping anywhere else closes the profile menu again, there's no mouse leaving on a touch screen
    if (!window.__sideOut) { window.__sideOut = true; document.addEventListener("click", (e) => { const sd = $("#side"), mm = $("#avatarMenu"); if (sd && mm && !mm.hidden && !sd.contains(e.target)) { mm.hidden = true; sd.classList.remove("pinned"); } }); }
    $$(".mi", m).forEach((x) => x.addEventListener("click", () => { m.hidden = true; side.classList.remove("pinned"); }));
    wireThemePicker(m);
    const ai = $("#adminIn"); if (ai) ai.onclick = () => adminLogin(() => route());
    const ao = $("#adminOut"); if (ao) ao.onclick = async () => { await api("/api/admin/logout", {}); ME.admin = null; toast("Signed out of admin"); route(); };
    $("#sideHead").onclick = () => toggleGroup(!$("#sideGroup").classList.contains("open"));
    // Opens when you point at it or tab into it with the keyboard, and folds away again as soon as you pick
    // something, like the apple tv sidebar. Clicking leaves focus on the link, so focus alone never keeps it open
    // Only a real mouse opens it by pointing. On a touch screen (ipad, iphone on its side) a tap also fires mouseenter and the
    // sidebar would open and stay open till you tapped somewhere else, there it stays a slim rail and the profile button opens the menu
    side.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !side.classList.contains("rest")) setOpen(true); });
    side.addEventListener("pointerleave", (e) => { if (e.pointerType !== "mouse") return; side.classList.remove("rest"); setOpen(false); });
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
      const sh = sheet(`<div class="more-head">${pav(p, "md")}<div><h2>${esc(p.name)}</h2><span class="secondary">${p.kids ? "Kids Profile" : "Profile"}</span></div></div>
        <div class="more-list">${row("#/mylist", "bookmark", "My List")}${row("#/settings", "gear", "Settings")}${row("#/history", "clock", "History")}
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
    const n = ROUTE_N;
    const r = await api("/api/profiles");
    if (n !== ROUTE_N) return;
    ME.admin = r.admin;
    const tile = (p) => `<button class="who-tile ${p.members ? "joint" : ""}" data-pid="${p.id}" aria-label="${manage ? "Edit" : "Watch as"} ${esc(p.name)}">
          <span class="who-av">${pav(p, "lg")}${manage ? `<span class="who-edit">${ic("pencil")}</span>` : ""}${p.kids ? `<span class="who-kids">Kids</span>` : ""}${p.locked && !manage ? `<span class="who-lock">${ic("lock")}</span>` : ""}</span>
          <span class="who-name">${esc(p.name)}</span></button>`;
    const loose = r.profiles.filter((p) => !p.folder);
    const singles = r.profiles.filter((p) => !p.members);
    // A folder is one tile that looks like an ios folder, with up to 4 of its profiles inside. Opening it shows them all
    const folderTile = (f) => {
      const ps = r.profiles.filter((p) => p.folder === f);
      return `<button class="who-tile folder" data-folder="${esc(f)}" aria-label="Open the ${esc(f)} folder, ${ps.length} profile${ps.length === 1 ? "" : "s"}">
        <span class="who-av"><span class="fold-ic">${ps.slice(0, 4).map((p) => `<span class="fold-cell">${pav(p)}</span>`).join("")}</span>${ps.length > 4 ? `<span class="fold-count">+${ps.length - 4}</span>` : ""}</span>
        <span class="who-name">${esc(f)}</span></button>`;
    };
    const extra = (!!ME.admin ? `<button class="who-tile add" id="addProfile" aria-label="Add a profile"><span class="who-av"><span class="av lg addav">${ic("plus")}</span></span><span class="who-name">Add Profile</span></button>`
      : manage ? "" : `<button class="who-tile add" id="askProfile" aria-label="Ask for your own profile"><span class="who-av"><span class="av lg addav">${ic("plus")}</span></span><span class="who-name">Ask for a Profile</span></button>`)
      + (!manage && singles.length > 1 ? `<button class="who-tile add" id="jointProfile" aria-label="Watch together, join two profiles"><span class="who-av"><span class="av lg addav">${ic("people")}</span></span><span class="who-name">Watch Together</span></button>` : "");
    app.innerHTML = `<main class="who">
      <h1 class="who-title">${manage ? "Manage Profiles" : "Who's Watching?"}</h1>
      <div class="who-grid ${manage ? "managing" : ""}">${loose.map(tile).join("")}${r.folders.map(folderTile).join("")}${extra}</div>
      <div class="who-actions">${manage ? `<button class="btn primary" id="doneManage">Done</button>` : ME.admin ? `<button class="btn outline" id="manageBtn">Manage Profiles</button>` : ""}</div>
    </main>`;
    // from is the folder it was opened out of, so cancelling a code puts you back in the folder
    const pick = async (p, from) => {
      if (manage) return editProfile(p, () => pageProfiles(true), r.folders);
      let res;
      if (p.locked) {
        const who = p.members ? p.members.map((m) => m.name).join("'s or ") + "'s" : p.name + "'s";
        res = await pinPad(`Enter ${who} Code`, (code) => api(`/api/profiles/${p.id}/select`, { pin: code }));
        if (!res) return from && openFolder(from);
      } else res = await api(`/api/profiles/${p.id}/select`, {});
      closeSheet();
      ME.profile = res.profile; ME.features = null;
      location.hash = "#/home";
      if (location.hash === "#/home") route();
    };
    const openFolder = (f) => {
      const ps = r.profiles.filter((p) => p.folder === f);
      const s = sheet(`<h2 class="fold-title">${esc(f)}</h2>
        <div class="who-grid fold-grid ${manage ? "managing" : ""}">${ps.map(tile).join("")}</div>
        ${manage && ME.admin ? `<div class="fold-rename"><label class="field grow"><span class="sr">Folder name</span><input id="fRen" maxlength="24" value="${esc(f)}"></label><button class="btn secondary small" id="fRenGo">Rename Folder</button></div><div class="form-err" id="fRenErr" role="alert"></div>` : ""}
        <div class="actions end"><button class="btn secondary small" data-close>Close</button></div>`);
      $$(".who-tile[data-pid]", s.el).forEach((b) => (b.onclick = () => pick(r.profiles.find((x) => x.id === Number(b.dataset.pid)), f)));
      const rn = $("#fRenGo", s.el);
      if (rn) rn.onclick = async () => {
        try { await api("/api/admin/folders", { old: f, new: $("#fRen", s.el).value }, "PUT"); s.close(); pageProfiles(true); }
        catch (e) { $("#fRenErr", s.el).textContent = e.message; }
      };
    };
    $$(".who-tile[data-pid]", app).forEach((b) => (b.onclick = () => pick(r.profiles.find((x) => x.id === Number(b.dataset.pid)))));
    $$(".who-tile[data-folder]", app).forEach((b) => (b.onclick = () => openFolder(b.dataset.folder)));
    const add = $("#addProfile"); if (add) add.onclick = () => editProfile(null, () => pageProfiles(manage), r.folders);
    const ask = $("#askProfile"); if (ask) ask.onclick = () => askProfile();
    const jp = $("#jointProfile"); if (jp) jp.onclick = () => jointSheet(r);
    const mb = $("#manageBtn"); if (mb) mb.onclick = () => pageProfiles(true);
    const dm = $("#doneManage"); if (dm) dm.onclick = () => pageProfiles(false);
    const first = $(".who-tile"); if (first) first.focus();
    fitWho();
  }

  // Watch Together: two people pick there profiles and get a joint one like "Tina & Trevor". Locked ones need there own
  // code, so nobody can join someone elses profile without them
  function jointSheet(r, pre = {}) {
    const singles = r.profiles.filter((p) => !p.members);
    let picked = (pre.picked || []).filter((id) => singles.some((p) => p.id === id));
    const byId = (id) => singles.find((p) => p.id === id);
    const s = sheet(`<h2>Watch Together</h2>
      <p class="secondary">Pick the two people watching. You get a joint profile that knows what both of you like.</p>
      <div class="jp-grid" role="group" aria-label="Who's watching together">${singles.map((p) => `<button class="jp-pick" data-jp="${p.id}" aria-pressed="false">${pav(p, "md")}<span>${esc(p.name)}</span>${p.locked ? `<span class="jp-lock">${ic("lock")}</span>` : ""}</button>`).join("")}</div>
      <div class="jp-preview" id="jpPreview" hidden></div>
      <div class="jp-warn" role="note">
        <b>${ic("info")} What joining shares</b>
        <ul>
          <li>The joint profile sees both of your watch history, ratings, My List and interests, and recommends from all of it.</li>
          <li>Anything watched on it is saved to both of your own profiles too.</li>
          <li>Removing something from its history or My List removes it for both of you.</li>
          <li>Anyone who opens it can see both histories. If either of you has a code, either code opens it.</li>
          <li>If one of you is a kids profile, the joint profile is a kids profile too.</li>
          <li>You can split it any time from its Settings, your own profiles keep everything.</li>
        </ul>
      </div>
      <div class="form-err" id="jpErr" role="alert">${esc(pre.err || "")}</div>
      <div class="actions end"><button class="btn secondary small" data-close>Cancel</button><button class="btn primary small" id="jpGo" disabled>${ic("people")} Join Profiles</button></div>`, { wide: true });
    const draw = () => {
      $$(".jp-pick", s.el).forEach((b) => b.setAttribute("aria-pressed", picked.includes(Number(b.dataset.jp))));
      const pv = $("#jpPreview", s.el), go = $("#jpGo", s.el);
      go.disabled = picked.length !== 2;
      if (picked.length !== 2) { pv.hidden = true; return; }
      const [a, b] = picked.map(byId);
      const fold = pre.folder ?? (a.folder || b.folder || "");
      pv.hidden = false;
      pv.innerHTML = `${pav({ members: [a, b] }, "md")}
        <label class="field grow"><span class="lbl">Name</span><input id="jpName" maxlength="24" value="${esc(pre.name || `${a.name} & ${b.name}`)}"></label>
        <label class="field grow"><span class="lbl">Folder</span><input id="jpFolder" maxlength="24" list="jpFolders" placeholder="No folder" value="${esc(fold)}"></label>
        <datalist id="jpFolders">${r.folders.map((f) => `<option value="${esc(f)}">`).join("")}</datalist>`;
    };
    $$(".jp-pick", s.el).forEach((b) => (b.onclick = () => {
      const id = Number(b.dataset.jp);
      if (picked.includes(id)) picked = picked.filter((x) => x !== id);
      else picked = [...picked, id].slice(-2);
      pre.name = undefined;
      draw();
    }));
    draw();
    $("#jpGo", s.el).onclick = async () => {
      const [a, b] = picked.map(byId);
      const name = $("#jpName", s.el).value, folder = $("#jpFolder", s.el).value;
      const keep = { picked, name, folder };
      s.close();
      // Each locked person types there own code, its checked straight away so a typo doesnt waste the other code
      const pins = {};
      for (const p of [a, b]) {
        if (!p.locked || ME.admin) continue;
        const code = await pinPad(`${p.name}'s Code`, async (c) => { await api(`/api/profiles/${p.id}/check-pin`, { pin: c }); return c; }, `${p.name} has to agree to joining`);
        if (!code) return jointSheet(r, keep);
        pins[p.id] = code;
      }
      try {
        const res = await api("/api/profiles/joint", { a: a.id, b: b.id, pins, name, folder });
        ME.profile = res.profile; ME.features = null;
        toast(`${res.profile.name} is ready`);
        location.hash = "#/home";
        if (location.hash === "#/home") route();
      } catch (e) { jointSheet(r, { ...keep, err: e.message }); }
    };
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

  // The icon chooser on the profile sheets: kino's own icons, or a picture searched from movies and shows, memes or brand logos
  const ICON_TABS = [["icons", "Icons"], ["movies", "Movies & TV"], ["memes", "Memes"], ["logos", "Logos"]];
  const iconBox = (st) => `<div class="ib">
      <div class="ib-tabs" role="tablist">${ICON_TABS.map(([k, l]) => `<button role="tab" data-ibt="${k}" aria-selected="${k === "icons"}">${l}</button>`).join("")}</div>
      <label class="field ib-q" hidden><span class="sr">Search</span><input id="ibQ" type="search" placeholder="Search" autocomplete="off" spellcheck="false"></label>
      <div class="icon-grid ib-grid" role="radiogroup" aria-label="Profile icon">${iconGrid(st)}</div></div>`;
  const iconGrid = (st) => AV.map((a, i) => `<button class="icon-pick" role="radio" aria-checked="${!st.image && i === st.icon}" data-i="${i}" aria-label="${a[0]}">${avatar(i, "md")}</button>`).join("");
  function wireIconBox(root, st, changed) {
    let tab = "icons", seq = 0, timer = 0;
    const grid = $(".ib-grid", root), qBox = $(".ib-q", root), q = $("#ibQ", root);
    const wirePicks = () => $$(".icon-pick", grid).forEach((b) => (b.onclick = () => {
      if (b.dataset.i != null) { st.icon = Number(b.dataset.i); st.image = ""; }
      else st.image = b.dataset.img;
      $$(".icon-pick", grid).forEach((x) => x.setAttribute("aria-checked", x === b));
      changed();
    }));
    const search = async () => {
      const my = ++seq;
      grid.innerHTML = Array.from({ length: 12 }, () => `<span class="sk ib-sk"></span>`).join("");
      let items = [];
      try { items = (await api(`/api/avatars/search?src=${tab}&q=${encodeURIComponent(q.value)}`)).items; }
      catch (e) { if (my === seq) grid.innerHTML = `<p class="secondary ib-empty">${esc(e.message)}</p>`; return; }
      if (my !== seq) return;
      grid.innerHTML = items.length ? items.map((it) => `<button class="icon-pick" role="radio" aria-checked="${st.image === it.image}" data-img="${esc(it.image)}" aria-label="${esc(it.name)}" title="${esc(it.name)}">${pav({ image: it.image }, "md")}</button>`).join("")
        : `<p class="secondary ib-empty">Nothing found${q.value ? ` for "${esc(q.value)}"` : ""}.</p>`;
      wirePicks();
    };
    $$("[data-ibt]", root).forEach((b) => (b.onclick = () => {
      tab = b.dataset.ibt;
      $$("[data-ibt]", root).forEach((x) => x.setAttribute("aria-selected", x === b));
      qBox.hidden = tab === "icons";
      q.placeholder = tab === "movies" ? "Search movies and shows" : tab === "memes" ? "Search memes" : "Search brands, like Netflix";
      if (tab === "icons") { seq++; grid.innerHTML = iconGrid(st); wirePicks(); } else search();
    }));
    q.oninput = () => { clearTimeout(timer); timer = setTimeout(search, 350); };
    q.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(timer); search(); } };
    wirePicks();
  }

  // Anyone can ask for there own profile, the admin approves it in Settings
  function askProfile() {
    const st = { icon: Math.floor(Math.random() * AV.length), image: "" };
    const s = sheet(`<h2>Ask for a Profile</h2><p class="secondary">Pick a name and an icon. It shows up once the admin approves it.</p>
      <div class="edit-top"><span id="apPreview">${pav(st, "lg")}</span>
        <label class="field grow"><span class="sr">Name</span><input id="apName" maxlength="24" placeholder="Your name"></label></div>
      ${iconBox(st)}
      <div class="form-err" id="apErr" role="alert"></div>
      <div class="actions end"><button class="btn secondary small" data-close>Cancel</button><button class="btn primary small" id="apSend">Ask</button></div>`, { wide: true });
    wireIconBox(s.el, st, () => ($("#apPreview", s.el).innerHTML = pav(st, "lg")));
    $("#apSend", s.el).onclick = async () => {
      try { await api("/api/profiles/request", { name: $("#apName", s.el).value, icon: st.icon, image: st.image }); s.close(); toast("Asked the admin, your profile shows up once it's approved", 5000); }
      catch (e) { $("#apErr", s.el).textContent = e.message; }
    };
  }

  // Edit or add a profile: name, folder and icon. Editing your own works for everyone, adding and deleting is admin only
  function editProfile(p, done, folders) {
    const isNew = !p, joint = !!(p && p.members);
    const st = { icon: p ? p.icon : Math.floor(Math.random() * AV.length), image: p ? p.image || "" : "", members: p && p.members };
    const s = sheet(`<h2>${isNew ? "Add Profile" : joint ? "Edit Joint Profile" : "Edit Profile"}</h2>
      <div class="edit-top"><span id="epPreview">${pav(st, "lg")}</span>
        <div class="grow edit-fields">
          <label class="field"><span class="sr">Name</span><input id="epName" maxlength="24" placeholder="Name" value="${esc(p ? p.name : "")}"></label>
          <label class="field"><span class="sr">Folder</span><input id="epFolder" maxlength="24" list="epFolders" placeholder="Folder, like Barker Family" value="${esc(p ? p.folder || "" : "")}"></label>
          <datalist id="epFolders">${(folders || []).map((f) => `<option value="${esc(f)}">`).join("")}</datalist>
        </div></div>
      ${ME.admin ? `<label class="set-row kids-row"><span><b>Kids Profile</b><span class="secondary">${joint ? "Only shows family and animated titles. Stays on while either of the two is a kids profile" : "Only shows family and animated titles, and hides admin tools"}</span></span><input type="checkbox" class="switch" id="epKids" ${p && p.kids ? "checked" : ""}></label>` : ""}
      ${joint ? `<p class="secondary edit-note">The icon is made from ${esc(p.members.map((m) => m.name).join(" and "))}'s own icons, so change those to change this one.</p>`
        : `<h3 class="sheet-sub">Choose an Icon</h3>${iconBox(st)}`}
      <div class="form-err" id="epErr" role="alert"></div>
      <div class="actions between">
        ${!isNew && joint ? `<button class="btn danger small" id="epSplit">${ic("people")} Split Profile</button>` : !isNew && isAdmin() ? `<button class="btn danger small" id="epDel">${ic("trash")} Delete Profile</button>` : "<span></span>"}
        <div class="actions"><button class="btn secondary small" data-close>Cancel</button><button class="btn primary small" id="epSave">Save</button></div>
      </div>`, { wide: true });
    const redraw = () => { $("#epPreview", s.el).innerHTML = pav(st, "lg"); };
    if (!joint) wireIconBox(s.el, st, redraw);
    if (!folders) api("/api/profiles").then((r) => { const dl = $("#epFolders", s.el); if (dl) dl.innerHTML = r.folders.map((f) => `<option value="${esc(f)}">`).join(""); }).catch(() => {});
    $("#epSave", s.el).onclick = async () => {
      const body = { name: $("#epName", s.el).value, folder: $("#epFolder", s.el).value, ...(joint ? {} : { icon: st.icon, image: st.image }) };
      const kb = $("#epKids", s.el);
      try {
        if (isNew) await api("/api/admin/profiles", { ...body, kids: !!(kb && kb.checked) });
        else if (ME.admin) {
          await api(`/api/admin/profiles/${p.id}`, { ...body, ...(kb ? { kids: kb.checked } : {}) }, "PUT");
          if (ME.profile && ME.profile.id === p.id) ME.profile = (await api("/api/me")).profile;
        }
        else if (ME.profile && ME.profile.id === p.id) { const r = await api("/api/profile", body, "PUT"); ME.profile = r.profile; }
        else {
          // Not admin and not your own profile, switch to it first then save
          const sel = await api(`/api/profiles/${p.id}/select`, {});
          ME.profile = sel.profile;
          const r = await api("/api/profile", body, "PUT"); ME.profile = r.profile;
        }
        s.close(); toast(isNew ? "Profile added" : "Profile saved"); done && done();
      } catch (e) { $("#epErr", s.el).textContent = e.message; }
    };
    const del = $("#epDel", s.el);
    if (del) del.onclick = async () => {
      s.close();
      if (!(await confirmSheet(`Delete ${p.name}?`, "Their watch history, ratings and settings are deleted too, and any joint profile they're in. This can't be undone.", "Delete Profile"))) return editProfile(p, done, folders);
      try { await api(`/api/admin/profiles/${p.id}`, undefined, "DELETE"); if (ME.profile && ME.profile.id === p.id) ME.profile = null; toast("Profile deleted"); done && done(); }
      catch (e) { toast(e.message, 5000); }
    };
    const sp = $("#epSplit", s.el);
    if (sp) sp.onclick = () => { s.close(); splitJoint(p, done); };
  }

  // Ends a joint profile. Both people keep everything on there own profiles
  async function splitJoint(p, done) {
    const names = p.members.map((m) => m.name).join(" and ");
    if (!(await confirmSheet(`Split ${p.name}?`, `${names} keep everything they watched on their own profiles. The joint profile's My List, ratings and settings go.`, "Split Profile"))) return;
    const go = (pin) => api(`/api/profiles/${p.id}/split`, pin ? { pin } : {});
    try {
      if (p.locked && !ME.admin) { if (!(await pinPad(`Enter ${p.members.map((m) => m.name).join("'s or ")}'s Code`, go))) return; }
      else await go();
      if (ME.profile && ME.profile.id === p.id) ME.profile = null;
      toast(`${p.name} is split`);
      done ? done() : (location.hash = "#/profiles");
    } catch (e) { toast(e.message, 5000); }
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
      ? `<img loading="lazy" decoding="async" src="${img(t.poster, 0, PW())}" alt="${esc(t.name)}" data-fallback="ph">`
      : `<div class="ph" style="--h:${hue(t.name)}">${esc(t.name)}</div>`;
    const sub0 = t.family ? t.family : t.external ? t.releaseInfo || (t.kind === "video" ? "Video" : t.kind === "series" ? "TV Show" : "Movie")
      : t.kind === "series" ? `${t.count} episode${t.count === 1 ? "" : "s"}` : t.releaseInfo || "";
    const rate = !t.family && Number(t.rating) > 0 ? `★ ${Number(t.rating).toFixed(1)}` : "";  // the IMDb score next to the year
    const sub = [sub0, rate].filter(Boolean).join(" · ");
    const mark = (t.watched ? `<span class="tile-check" title="Watched">${ic("check")}</span>` : "") + (t.family ? `<span class="tile-love ${t.loved ? "loved" : ""}" title="${esc(t.family)}">${ic(t.loved ? "love" : "up")}</span>` : "");
    const href = t.external ? extHref(t) : `#/title/${t.id}`;
    return `<a class="tile poster ${t.external ? "ext" : ""} ${t.watched ? "is-watched" : ""}" href="${href}" ${trailerAttrs(t)} ${t.external && t.poster ? `data-poster="${esc(t.poster)}"` : ""}><div class="art">${art}${mark}</div><div class="cap">${esc(t.name)}</div><div class="sub">${esc(sub)}</div></a>`;
  }
  function wideTile(t, opts = {}) {
    const bg = t.background
      ? `<img loading="lazy" decoding="async" src="${img(t.background, 0, WW())}" alt="${esc(t.name)}" data-fallback="ph">`
      : `<div class="ph" style="--h:${hue(t.name)}">${esc(t.name)}</div>`;
    const logo = t.logo && t.background && opts.progress == null ? `<img class="logo-over" loading="lazy" decoding="async" src="${img(t.logo, 1, LITE ? 240 : 480)}" alt="" data-fallback="hide">` : "";
    const bar = opts.progress != null && opts.progress > 0 ? `<div class="bar"><i style="width:${Math.min(100, opts.progress * 100)}%"></i></div>` : "";
    const href = opts.href || (t.external ? extHref(t) : `#/title/${t.id}`);
    const x = opts.hide && !TV ? `<button class="tile-x" data-hide="${esc(opts.hide)}" aria-label="Remove ${esc(t.name)} from Continue Watching" title="Remove from Continue Watching">${ic("close")}</button>` : "";
    return `<a class="tile landscape" href="${href}" ${trailerAttrs(t)} ${TV && opts.hide ? `data-cw="${esc(opts.hide)}" data-cwname="${esc(t.name)}"` : ""} ${opts.play ? `data-play="${esc(opts.play)}" data-tid="${esc(t.id)}"` : ""}><div class="art">${bg}${logo}${bar}${opts.play ? `<span class="tile-play">${ic("play")}</span>` : ""}${x}</div>
      <div class="cap">${esc(t.name)}</div><div class="sub">${esc(opts.sub || [t.genres?.slice(0, 2).join(", ") || t.releaseInfo || "", Number(t.rating) > 0 ? `★ ${Number(t.rating).toFixed(1)}` : ""].filter(Boolean).join(" · "))}</div></a>`;
  }
  const metaLine = (t) => [t.kind === "video" ? "" : t.kind === "series" ? "TV Show" : "Movie", t.releaseInfo, t.genres?.slice(0, 2).join(", "), t.runtime, t.rating ? `IMDb ${t.rating}` : ""].filter(Boolean);

  // ---------------------------------------------------------- trailers
  // The YouTube id of a title's trailer comes from the details Cinemeta has (no addon needed, it can't touch the sources). A Trailer button on
  // the title pages opens it. On computers a trailer also plays in the background of a title's page and when you hover a card on a row (the
  // card grows and pushes the rest aside, like Netflix), muted. Touch screens and TVs only get the button. It uses youtube-nocookie.com, so
  // YouTube sees the viewer's address when one plays.
  const CAN_HOVER = !TV && !LITE && !!window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  // TVs preview the card that is selected (focus) instead of hovered, unless the TV has very little memory
  const TV_PREVIEW = TV;
  // A weak TV or stick (2GB of memory or less, or 4 cores or fewer) skips the growing card trailer, it is the heaviest part. The background trailer
  // on a title page and the Trailer button stay
  const WEAK = TV && !!((navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
  const cardPreviewsOn = () => previewsOn() && !WEAK;
  const previewsOn = () => (CAN_HOVER || TV_PREVIEW) && !(ME.profile && ME.profile.prefs && ME.profile.prefs.previews === false);
  const tileActive = (t) => (TV ? document.activeElement === t : t.matches(":hover"));
  const TRAILERS = new Map();  // kind/imdb -> a promise, then the id ("" for none or one that can't be embedded)
  async function trailerFor(kind, imdb) {
    if (!imdb || !/^tt\d+$/.test(imdb)) return "";
    const key = `${kind === "series" ? "series" : "movie"}/${imdb}`;
    if (!TRAILERS.has(key)) TRAILERS.set(key, api(`/api/trailer/${key}`).then((r) => r.yt || "").catch(() => ""));
    return TRAILERS.get(key);
  }
  const noTrailer = (kind, imdb) => TRAILERS.set(`${kind === "series" ? "series" : "movie"}/${imdb}`, Promise.resolve(""));
  const ytSrc = (id, o = {}) => `https://www.youtube-nocookie.com/embed/${id}?` + new URLSearchParams({
    autoplay: 1, mute: o.mute ? 1 : 0, controls: o.controls ? 1 : 0, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, disablekb: o.controls ? 0 : 1,
    fs: o.controls ? 1 : 0, hl: "en", cc_load_policy: 0, enablejsapi: 1, origin: location.origin }).toString();
  const ytCmd = (f, func, args = []) => { try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*"); } catch (_) {} };
  // Sound on by default: a trailer starts muted (a browser always lets that autoplay) and the sound is switched on as soon as it is playing, when the
  // page has been clicked or tapped before (browsers only allow sound after that). If it isn't allowed it just stays muted and the sound button shows it
  const soundAllowed = () => (navigator.userActivation ? navigator.userActivation.hasBeenActive : true);
  const wantSound = () => !(ME.profile && ME.profile.prefs && ME.profile.prefs.preview_sound === false);
  // YouTube draws its title, a More videos strip and buttons over the first few seconds of any video, controls off or not, so the video stays
  // invisible until those are gone (a loop restart is hidden the same way). It loops by hand cause the loop param adds previous and next buttons
  const YT_CLEAR = 6500, YT_CLEAR_CROP = 5000;  // a card or background crops the video a little, which hides the title strip and bar, so only the centre button needs to be gone
  // An embedded trailer in host. o: mute, loop, controls, cover (fill the box), contain (fit the whole frame in the box), sound (turn the sound on
  // once it shows), onPlay (it is showing), onFail, onMuted (the player says its sound is on or off)
  function mountTrailer(host, yt, o = {}) {
    const f = document.createElement("iframe");
    f.src = ytSrc(yt, { ...o, mute: o.mute || o.sound });
    let wantSnd = !!o.sound, state = -1, shown = false, clearT = null;
    f.style.opacity = "0";
    f.title = "Trailer";
    f.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
    f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
    f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    f.setAttribute("aria-hidden", o.controls ? "false" : "true");
    if (!o.controls) f.tabIndex = -1;
    const fit = () => {
      const op = f.style.opacity;
      if (!o.cover && !o.contain) { f.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0"; f.style.opacity = op; return; }
      const r = host.getBoundingClientRect(), w = r.width, h = r.height;
      const W = o.contain ? Math.min(w, (h * 16) / 9) : Math.max(w, (h * 16) / 9), H = (W * 9) / 16;
      f.style.cssText = `position:absolute;left:50%;top:50%;width:${W}px;height:${H}px;border:0;transform:translate(-50%,-50%) scale(${o.cover ? 1.3 : 1});pointer-events:none;transition:opacity .5s`;
      f.style.opacity = op;
    };
    const reveal = () => {
      clearTimeout(clearT);
      clearT = setTimeout(() => {
        shown = true; f.style.opacity = "1";
        if (wantSnd && soundAllowed()) { ytCmd(f, "unMute"); ytCmd(f, "setVolume", [100]); }  // the sound waits for the picture
        o.onPlay && o.onPlay();
      }, o.cover ? YT_CLEAR_CROP : YT_CLEAR);
    };
    fit();
    const on = (e) => {
      if (e.source !== f.contentWindow) return;
      let d = e.data;
      try { if (typeof d === "string") d = JSON.parse(d); } catch (_) { return; }
      if (!d) return;
      const st = d.event === "onStateChange" ? d.info : d.event === "infoDelivery" && d.info && typeof d.info.playerState === "number" ? d.info.playerState : null;
      if (st !== null && st !== state) {
        state = st;
        if (st === 1 && !shown && !clearT) reveal();
        if (st === 0 && o.loop) { shown = false; clearT = null; f.style.opacity = "0"; if (wantSnd) ytCmd(f, "mute"); ytCmd(f, "seekTo", [0, true]); ytCmd(f, "playVideo"); }
        if (shown || st !== 1) o.onState && o.onState(st);
        if (st === 1 && !shown && clearT) o.wait && o.wait(o.cover ? YT_CLEAR_CROP : YT_CLEAR);
      }
      if (d.event === "onError") o.onFail && o.onFail(d.info);
      if (d.event === "infoDelivery" && d.info && typeof d.info.muted === "boolean") o.onMuted && o.onMuted(d.info.muted);
    };
    window.addEventListener("message", on);
    window.addEventListener("resize", fit);
    f.addEventListener("load", () => {
      try { f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); } catch (_) {}
      setTimeout(() => ytCmd(f, "unloadModule", ["captions"]), 1200);
    });
    host.appendChild(f);
    return {
      frame: f, refit: fit,
      stop() { clearTimeout(clearT); window.removeEventListener("message", on); window.removeEventListener("resize", fit); f.remove(); },
      mute(b) { wantSnd = !b; ytCmd(f, b ? "mute" : "unMute"); if (!b) ytCmd(f, "setVolume", [100]); },
      pause() { ytCmd(f, "pauseVideo"); },
      get state() { return state; },
      play() { ytCmd(f, "playVideo"); },
    };
  }
  const trailerAttrs = (t) => { const im = t.imdb || (/^tt\d+$/.test(String(t.id || "")) ? t.id : ""); return im && t.kind !== "video" ? `data-imdb="${esc(im)}" data-kind="${t.kind === "series" ? "series" : "movie"}"` : ""; };

  // The card on a row: after half a second of hovering it grows to a wide card playing the trailer and the rest of the row slides aside
  const HV = { tile: null, timer: null, closeT: null, ctl: null, wait: null, fade: null, cool: 0, settle: null, x: 0, y: 0, sx: 0, sy: 0 };
  function closeTile() {
    clearTimeout(HV.timer); clearTimeout(HV.closeT); clearTimeout(HV.wait); clearTimeout(HV.fade); clearInterval(HV.tick); HV.toggle = null;
    const tile = HV.tile;
    if (HV.ctl) { HV.ctl.stop(); HV.ctl = null; }
    HV.tile = null;
    if (tile && !tile.classList.contains("tile-open")) $$(".tile-trailer, .tile-wait", tile).forEach((x) => x.remove());  // one that never got to show
    if (!tile || !tile.classList.contains("tile-open")) return;
    const art = $(".art", tile), row = tile.parentElement;
    tile.classList.remove("tile-open");
    tile.style.width = tile.style.transform = "";
    if (art) {
      art.classList.remove("tr-on");
      $$(".tile-trailer, .tile-ov, .tile-wait", art).forEach((x) => x.remove());
      // The card keeps its height and the picture its own while it shrinks back. Without that the picture went back to its tall shape while
      // still wide for a moment, and the row jumped to almost twice its height
      art.style.height = (tile._h0 || art.getBoundingClientRect().height) + "px";
    }
    if (row) { [...row.children].forEach((k) => (k.style.transform = "")); row.style.scrollSnapType = ""; }
    // A short pause before the next card (the one that ends up under a still mouse after the shrink) can start
    HV.cool = performance.now() + 480;
    setTimeout(() => { if (HV.tile !== tile) { tile.style.height = ""; if (art) { art.style.height = art.style.aspectRatio = ""; } } }, 460);
  }
  async function openTile(tile) {
    const kind = tile.dataset.kind, imdb = tile.dataset.imdb;
    const yt = await trailerFor(kind, imdb);
    if (HV.tile !== tile || !tile.isConnected || !yt || !pl.el.hidden || sheetClose || !tileActive(tile)) return;
    const row = tile.parentElement, art = $(".art", tile);
    if (!row || !art) return;
    if (tile.style.height) return;  // still shrinking back from the last time
    // About twice as wide as a poster (a little over a third wider for a wide card), never taller than the card with its caption, so nothing below moves
    const ar = { width: art.offsetWidth, height: art.offsetHeight }, th = Math.round(tile.getBoundingClientRect().height);  // the real size, not the hover zoom
    // Room to grow: to the right if the card fits on screen (a TV keeps 48px in from the edge), otherwise to the left, and a card that has less
    // room than that only grows as far as there is. No room at all and it stays as it is
    const rr = row.getBoundingClientRect(), tr = tile.getBoundingClientRect(), edge = TV ? 48 : 24;
    const roomR = Math.min(rr.right, innerWidth) - edge - tr.right, roomL = tr.left - (Math.max(rr.left, 0) + (TV ? 120 : 24));
    const want = Math.round(Math.min((th * 16) / 9, ar.width * 2.3)) - Math.round(ar.width);
    const dir = roomR >= want || roomR >= roomL ? 1 : -1, extra = Math.min(want, Math.floor(dir > 0 ? roomR : roomL));
    if (extra < 30) return;
    const ow = Math.round(ar.width) + extra, oh = Math.round(Math.min(th, Math.max(ar.height, (ow * 9) / 16)));
    tile._h0 = Math.round(ar.height);
    // The video goes in first, at the size the card will be and invisible (the card clips it), and the card stays exactly as it is
    const host = document.createElement("div");
    host.className = "tile-trailer";
    host.style.cssText = `width:${ow}px;height:${oh}px`;
    art.appendChild(host);
    let grown = false, muted = true;
    // While it loads and the start-up overlays run their course a small pill says so, then counts down
    const pill = document.createElement("div");
    pill.className = "tile-wait";
    pill.innerHTML = `<i></i><span>Trailer</span>`;
    art.appendChild(pill);
    const countdown = (ms) => {
      clearInterval(HV.tick);
      const end = performance.now() + ms, say = () => { const n = Math.max(1, Math.ceil((end - performance.now()) / 1000)); $("span", pill).textContent = `Trailer in ${n}`; };
      say(); HV.tick = setInterval(say, 250);
    };
    const grow = () => {
      if (grown || HV.tile !== tile || !tile.isConnected) return;
      grown = true;
      clearTimeout(HV.wait); clearInterval(HV.tick); pill.remove();
      const kids = [...row.children], i = kids.indexOf(tile);
      // The row doesn't snap to its cards while one is open (the card is wider than its column, and snapping back moved the row and closed it)
      HV.sx = row.scrollLeft; HV.sy = scrollY; row.style.scrollSnapType = "none";
      tile.classList.add("tile-open");
      tile.style.height = th + "px";
      tile.style.width = ow + "px";
      if (dir < 0) tile.style.transform = `translateX(${-extra}px)`;
      art.style.aspectRatio = "auto";
      art.style.height = oh + "px";
      kids.forEach((k, j) => { if (dir > 0 && j > i) k.style.transform = `translateX(${extra}px)`; if (dir < 0 && j < i) k.style.transform = `translateX(${-extra}px)`; });
      const ov = document.createElement("div");
      ov.className = "tile-ov";
      // A TV has no pointer, so it only shows whether the sound is on (the play/pause key on the remote switches it)
      ov.innerHTML = TV ? `<span class="tile-snd tile-ind" aria-hidden="true">${ic("vol")}</span>` : `<button type="button" class="tile-snd" aria-label="Sound off" title="Sound off">${ic("vol")}</button>`;
      art.appendChild(ov);
      const snd = $(".tile-snd", ov);
      show(muted);
      if (snd) snd.onclick = (e) => { e.preventDefault(); e.stopPropagation(); HV.ctl && HV.ctl.mute(!muted); show(!muted); };
      HV.toggle = () => { HV.ctl && HV.ctl.mute(!muted); show(!muted); };
      // The video shows once the card has finished growing
      HV.fade = setTimeout(() => art.classList.add("tr-on"), 420);
    };
    const show = (m) => { muted = m; const snd = $(".tile-snd", art); if (snd) { snd.innerHTML = ic(m ? "mute" : "vol"); snd.title = m ? "Sound on" : "Sound off"; snd.setAttribute("aria-label", snd.title); } };
    HV.ctl = mountTrailer(host, yt, { sound: wantSound(), loop: true, cover: true, onMuted: show, onPlay: grow, wait: countdown, onFail: () => { noTrailer(kind, imdb); closeTile(); } });
    // If it never starts (blocked, slow) nothing was changed, so it is just dropped
    HV.wait = setTimeout(() => { if (!grown && HV.tile === tile) closeTile(); }, 14000);
  }
  const arm = (t) => {
    clearTimeout(HV.closeT);
    if (HV.tile === t) return;
    closeTile();
    HV.tile = t;
    HV.timer = setTimeout(() => openTile(t), TV ? 250 : 120);  // it loads straight away, the card only grows once the video is clean
  };
  const tileOf = (el) => { const t = el && el.closest && el.closest("a.tile[data-imdb]"); return t && t.parentElement && t.parentElement.classList.contains("row") ? t : null; };
  document.addEventListener("mousemove", (e) => { HV.x = e.clientX; HV.y = e.clientY; }, { passive: true });
  document.addEventListener("mouseover", (e) => {
    if (!cardPreviewsOn() || TV) return;
    const t = tileOf(e.target);
    if (!t) return;
    // Right after a card shrinks back the cards move under the mouse. It waits for them to settle and then looks at what is under the mouse,
    // so it never flips between two cards
    const left = HV.cool - performance.now();
    if (left > 0) { clearTimeout(HV.settle); HV.settle = setTimeout(() => { const u = tileOf(document.elementFromPoint(HV.x, HV.y)); if (u && !HV.tile) arm(u); }, left + 40); return; }
    arm(t);
  });
  document.addEventListener("mouseout", (e) => {
    const t = e.target.closest && e.target.closest("a.tile[data-imdb]");
    if (!t || HV.tile !== t || (e.relatedTarget && t.contains(e.relatedTarget))) return;
    clearTimeout(HV.timer); clearTimeout(HV.closeT);
    HV.closeT = setTimeout(() => closeTile(), 140);
  });
  // A TV has no mouse: the card that is selected waits a moment (the remote moves along the row quickly) and then previews
  document.addEventListener("focusin", (e) => {
    if (!TV || !cardPreviewsOn()) return;
    const t = tileOf(e.target);
    if (t) arm(t); else if (HV.tile) closeTile();
  });
  document.addEventListener("focusout", (e) => { if (TV && HV.tile && !(e.relatedTarget && HV.tile.contains(e.relatedTarget))) closeTile(); });
  // Scrolling closes an open card (a card that is only waiting to open carries on, selecting something on a TV scrolls the row a little)
  document.addEventListener("scroll", () => {
    const t = HV.tile;
    if (!t || !t.classList.contains("tile-open")) return;
    // Only a real scroll closes it, not the little shifts that come with the card growing
    const row = t.parentElement;
    if (Math.abs(scrollY - HV.sy) > 16 || (row && Math.abs(row.scrollLeft - HV.sx) > 40)) closeTile();
  }, { capture: true, passive: true });
  // The play/pause key on a TV remote turns the sound of the open trailer (the card or the page background) off and on
  document.addEventListener("keydown", (e) => {
    if (!TV || TRAILER_VIEW || !(e.key === "MediaPlayPause" || e.keyCode === 179)) return;
    const f = HV.toggle || HERO.toggle;
    if (f) { e.preventDefault(); f(); }
  });
  document.addEventListener("pointerdown", (e) => { if (HV.tile && !(e.target.closest && e.target.closest(".tile-snd"))) closeTile(); }, true);

  // The background of a title's page: a trailer loads at once and fades in behind the title once it is clean, muted, with a sound button. It pauses when the page
  // is scrolled past it or the tab is hidden
  const HERO = { timer: null, ctl: null, io: null, args: null };
  function stopHero() {
    clearTimeout(HERO.timer);
    if (HERO.ctl) HERO.ctl.stop();
    if (HERO.io) HERO.io.disconnect();
    HERO.ctl = HERO.io = HERO.toggle = null;
  }
  async function heroTrailer(kind, imdb) {
    stopHero();
    const box = $("#heroTrailer"), btn = $("#trailerBtn");
    if (!box || !imdb) return;
    HERO.args = [kind, imdb];
    const n = ROUTE_N;
    const yt = await trailerFor(kind, imdb);
    if (n !== ROUTE_N || !box.isConnected) return;
    if (yt && btn) { btn.hidden = false; btn.onclick = () => openTrailer(yt, kind, imdb); }
    if (!yt || !previewsOn()) return;
    HERO.timer = setTimeout(() => {
      if (n !== ROUTE_N || !box.isConnected || !pl.el.hidden || sheetClose || TRAILER_VIEW) return;
      let muted = true;
      const mute = $("#heroMute"), show = (m) => { muted = m; if (mute) { mute.innerHTML = ic(m ? "mute" : "vol"); mute.setAttribute("aria-label", m ? "Sound on" : "Sound off"); mute.title = m ? "Sound on" : "Sound off"; } };
      HERO.ctl = mountTrailer(box, yt, { sound: wantSound(), loop: true, cover: true, onMuted: show, onPlay: () => { box.classList.add("tr-on"); if (mute) mute.hidden = false; }, onFail: () => { noTrailer(kind, imdb); stopHero(); if (btn) btn.hidden = true; } });
      if (mute) mute.onclick = () => { HERO.ctl && HERO.ctl.mute(!muted); show(!muted); };
      HERO.toggle = () => { HERO.ctl && HERO.ctl.mute(!muted); show(!muted); };
      if ("IntersectionObserver" in window) {
        HERO.io = new IntersectionObserver(([en]) => { if (!HERO.ctl) return; en.isIntersecting ? HERO.ctl.play() : HERO.ctl.pause(); }, { threshold: 0.25 });
        HERO.io.observe(box);
      }
    }, 100);
  }
  document.addEventListener("visibilitychange", () => { if (HERO.ctl) document.hidden ? HERO.ctl.pause() : HERO.ctl.play(); });

  // A show page from an addon draws its buttons again as the sources come in, so the Trailer button is added to whatever is there
  async function addTrailerButton(kind, id, box) {
    const imdb = String(id || "").split(":")[0];
    const yt = await trailerFor(kind, imdb);
    const row = box && $(".actions", box);
    if (!yt || !row || !box.isConnected || $("#trailerBtn", box)) return;
    const b = document.createElement("button");
    b.className = "btn secondary"; b.id = "trailerBtn"; b.type = "button";
    b.innerHTML = `${ic("trailer")} Trailer`;
    b.onclick = () => openTrailer(yt, kind, imdb);
    const play = $("#pdPlay", row);
    play ? play.after(b) : row.prepend(b);
  }

  // The Trailer button: the trailer on its own, full screen, with its controls and sound. Escape or Back closes it
  let TRAILER_VIEW = null;
  function closeTrailer() {
    if (!TRAILER_VIEW) return false;
    const v = TRAILER_VIEW; TRAILER_VIEW = null;
    clearTimeout(v.hideT);
    v.ctl.stop(); v.el.remove();
    document.body.style.overflow = "";
    if (v.back && v.back.isConnected) v.back.focus({ preventScroll: true });
    // The page's own background trailer was stopped for it, it starts again (with its short wait) when this is closed
    if (HERO.args && $("#heroTrailer")) heroTrailer(...HERO.args);
    return true;
  }
  // The trailer on its own, full screen. Nothing of YouTube's shows: the video is zoomed a little so its title strip and bar fall outside the box,
  // clicks never reach it, and the controls are Kino's own: a close button top right, play and pause bottom left, sound bottom right
  function openTrailer(yt, kind, imdb) {
    closeTrailer(); closeTile();
    stopHero();  // the page's background trailer is stopped, not just paused, so nothing plays or makes a sound behind this
    const back = document.activeElement;
    const el = document.createElement("div");
    el.className = "trailer-view"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Trailer");
    el.innerHTML = `<div class="tr-box" id="trBox"><div class="tr-load" id="trLoad"><div class="spin"></div></div><button type="button" class="tr-hit" id="trHit" aria-label="Pause or play"></button>
        <div class="tr-bar" id="trBar"><button type="button" class="glass-btn round" id="trPlay" aria-label="Pause" title="Pause (Space)">${ic("pause")}</button><button type="button" class="glass-btn round" id="trSnd" aria-label="Sound off" title="Sound off (M)">${ic("vol")}</button></div></div>
      <button type="button" class="glass-btn round tr-x" id="trClose" aria-label="Close trailer" title="Close (Esc)">${ic("close")}</button>`;
    document.body.appendChild(el);
    document.body.style.overflow = "hidden";
    let muted = false, playing = false;
    const snd = $("#trSnd", el), pp = $("#trPlay", el), bar = $("#trBar", el);
    const showSnd = (m) => { muted = m; snd.innerHTML = ic(m ? "mute" : "vol"); snd.title = m ? "Sound on (M)" : "Sound off (M)"; snd.setAttribute("aria-label", snd.title); };
    const showPlay = (on) => { playing = on; pp.innerHTML = ic(on ? "pause" : "play"); pp.title = on ? "Pause (Space)" : "Play (Space)"; pp.setAttribute("aria-label", on ? "Pause" : "Play"); bar.classList.toggle("tr-still", !on); };
    // It was asked for with a click, so it starts with the sound on
    const ctl = mountTrailer($("#trBox", el), yt, { sound: true, loop: true, contain: true, onMuted: showSnd,
      onPlay: () => { $("#trLoad", el).hidden = true; showPlay(true); },
      onState: (st) => { if (st === 1) showPlay(true); else if (st === 2 || st === 0) showPlay(false); },
      onFail: () => { noTrailer(kind, imdb); closeTrailer(); toast("This trailer can't be played here", 4000); } });
    TRAILER_VIEW = { el, ctl, back, toggle: () => (playing ? ctl.pause() : ctl.play()), mute: () => { ctl.mute(!muted); showSnd(!muted); } };
    // The bar hides after a moment without the mouse moving, and stays up while it is paused
    const wake = () => { bar.classList.add("tr-up"); clearTimeout(TRAILER_VIEW && TRAILER_VIEW.hideT); if (TRAILER_VIEW) TRAILER_VIEW.hideT = setTimeout(() => bar.classList.remove("tr-up"), 2500); };
    el.addEventListener("mousemove", wake); wake();
    $("#trHit", el).onclick = () => TRAILER_VIEW && TRAILER_VIEW.toggle();
    pp.onclick = () => TRAILER_VIEW && TRAILER_VIEW.toggle();
    snd.onclick = () => TRAILER_VIEW && TRAILER_VIEW.mute();
    $("#trClose", el).onclick = closeTrailer;
    el.addEventListener("mousedown", (e) => { if (e.target === el) closeTrailer(); });
    setTimeout(() => $("#trClose", el) && $("#trClose", el).focus({ preventScroll: true }), 50);
  }
  document.addEventListener("keydown", (e) => {
    if (!TRAILER_VIEW) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeTrailer(); }
    else if ((e.key === " " || e.key === "k") && !(e.target.closest && e.target.closest("button"))) { e.preventDefault(); e.stopImmediatePropagation(); TRAILER_VIEW.toggle(); }
    else if (e.key === "m") { e.preventDefault(); e.stopImmediatePropagation(); TRAILER_VIEW.mute(); }
  }, true);
  const stopPreviews = () => { closeTile(); stopHero(); };

  // ---------------------------------------------------------- home
  async function pageHome() {
    const n = ROUTE_N;
    const h = await api("/api/home");
    if (n !== ROUTE_N) return;
    if (h.empty) {
      app.innerHTML = topbar("home") + `<main class="page"><div class="empty">
        <h2>${h.scanning ? "Scanning your Storage Box" : !h.mounted ? "The Storage Box isn't connected" : "Nothing here yet"}</h2>
        <p>${h.error ? esc(h.error) : h.scanning ? "This takes a moment the first time." : isAdmin() ? "Install an addon in Settings to browse and stream, or videos show up here once the sync has downloaded them." : "Nothing has been set up to watch yet, ask the admin."}</p>
        ${isAdmin() ? `<div class="actions" style="justify-content:center"><a class="btn secondary small" href="#/settings">Open Settings</a><a class="btn secondary small" href="#/sync">Open Sync</a></div>` : ""}</div></main>`;
      wireTopbar();
      clearTimeout(SCAN_T);
      if (h.scanning) SCAN_T = setTimeout(() => location.hash === "#/home" && route(), 4000);
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
        ${h.shelves.map((s) => s.style === "fresh" ? freshShelf(s) : `<section class="shelf" aria-label="${esc(s.title)}"><h2 class="section-title">${esc(s.title)}${s.source ? ` <span class="from">${esc(s.source)}</span>` : ""}${TV && s.style === "continue" ? ` <span class="from">Hold OK to remove</span>` : ""}${s.more ? ` <a href="${esc(s.more)}">See All</a>` : ""}</h2>
          <div class="row ${s.style === "poster" ? "posters" : "wide"}" ${s.next != null ? `data-shelf="${esc(s.id)}" data-next="${esc(s.next)}" data-style="${esc(s.style)}"` : ""} ${s.pending ? "data-pending" : ""}>${s.pending ? Array.from({ length: 8 }, () => `<div class="sk ${s.style === "poster" ? "sk-poster" : "sk-wide"}"></div>`).join("") : ""}${s.items.map((t) => s.style === "poster" ? posterTile(t)
            : s.style === "continue" ? wideTile(t, { progress: t.dur ? t.pos / t.dur : 0, hide: t.file_id, href: t.stream ? extHref(t) : undefined,
                sub: t.kind === "series" ? `${epLabel(t.season, t.episode)}${t.next_episode ? " · Next episode" : t.dur ? ` · ${clock(t.dur - t.pos)} left` : ""}` : `${clock(t.dur - t.pos)} left` })
            : wideTile(t)).join("")}${TV && s.more ? moreCard(s.more, s.style === "poster", s.more === "#/shows" ? "All TV Shows" : "All Movies") : ""}</div></section>`).join("")}
      </main>`;
    wireTopbar();
    startHero(heroes.length);
    growShelves(app);

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
  const moreCard = (href, poster, label) => `<a class="tile more-card ${poster ? "poster" : "landscape"}" href="${href}"><div class="art"><span class="more-in">${ic("chevronR")}<b>${esc(label)}</b></span></div><div class="cap">&nbsp;</div></a>`;

  // Home rows start with the first batch and fetch more as you get near the end of one, so a row can go on for
  // hundreds of titles. On a tv the View More card stays at the end
  function growShelves(root) {
    $$(".row[data-shelf]", root).forEach((row) => {
      let busy = false;
      const more = async () => {
        if (busy || !row.dataset.next || !row.isConnected) return;
        if (row.scrollWidth - row.scrollLeft - row.clientWidth > row.clientWidth * 1.5) return;
        busy = true;
        try {
          const r = await api(`/api/shelf?id=${encodeURIComponent(row.dataset.shelf)}&skip=${row.dataset.next}`);
          if (row.hasAttribute("data-pending")) {
            // A row that was still loading when Home opened: in it goes, or off it comes if the addon had nothing
            if (r.retry) { busy = false; setTimeout(more, 8000); return; }
            if (r.items.length < 3) { row.closest("section").remove(); return; }
            row.removeAttribute("data-pending");
            $$(".sk", row).forEach((x) => x.remove());
          }
          const html = r.items.map((t) => (row.dataset.style === "wide" ? wideTile(t) : posterTile(t))).join("");
          const card = $(".more-card", row);
          if (card) card.insertAdjacentHTML("beforebegin", html); else row.insertAdjacentHTML("beforeend", html);
          if (r.next) row.dataset.next = r.next; else delete row.dataset.next;
        } catch (_) {}
        busy = false;
      };
      row.addEventListener("scroll", more, { passive: true });
      row.addEventListener("focusin", more);
      // Rows still loading, and short ones that cant be scrolled yet, ask for more straight away
      if (row.hasAttribute("data-pending") || row.scrollWidth <= row.clientWidth * 1.5) more();
    });
  }

  // Floating back button on title pages, phones dont have the sidebar to get out with
  const backBtn = () => `<button class="page-back glass" data-goback aria-label="Back">${ic("back")}</button>`;
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-goback]")) return;
    history.length > 1 ? history.back() : (location.hash = "#/home");
  });

  // Hero artwork. Wide art on most screens, the poster on portrait phones so it isn't cropped to a thin strip
  // The big art gets asked for at about the size of the screen, the server only has a few sizes so this picks one of those
  // (and full size on a really wide screen)
  const HW = () => {
    if (LITE) return 1280;
    const need = (innerWidth * (devicePixelRatio || 1)) / 1.2;
    return need <= 640 ? 640 : need <= 960 ? 960 : need <= 1280 ? 1280 : 0;
  };
  function heroArt(t, lazy) {
    const wide = t.background ? (LITE ? t.background : t.background.replace("/medium/", "/large/")) : null;
    const tall = t.poster || null;
    if (!wide && !tall) return "";
    return `<picture>${tall && wide ? `<source media="(max-width: 760px) and (orientation: portrait)" srcset="${img(tall, 0, 640)}">` : ""}<img ${lazy ? 'loading="lazy"' : ""} decoding="async" src="${img(wide || tall, 0, HW())}" data-alt="${esc(t.background || "")}" alt="" data-fallback="hide" ${!wide ? 'class="tall"' : ""}></picture>`;
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
        ${t.logo ? `<img class="hero-logo" src="${img(t.logo, 1, LW())}" alt="${esc(t.name)}" data-fallback="text">` : `<h1 class="hero-name">${esc(t.name)}</h1>`}
        ${t.cont ? `<div class="hero-meta"><span>${esc(what)}</span></div>
          <div class="hero-prog"><i style="width:${t.dur ? Math.min(100, (t.pos / t.dur) * 100) : 0}%"></i></div>`
          : `<div class="hero-meta">${metaLine(t).map((m, j) => `<span class="${j ? "dot-sep" : ""}">${esc(m)}</span>`).join("")}</div>
          ${t.description ? `<p class="hero-desc">${esc(t.description)}</p>` : ""}`}
        <div class="actions">
          ${t.cont ? `<button class="btn primary" data-heroresume="${esc(t.file_id)}" data-tid="${esc(t.id || "")}" ${TV ? `data-cw="${esc(t.file_id)}" data-cwname="${esc(t.name)}"` : ""} ${tab}>${ic("play")} ${t.next_episode ? "Play" : "Resume"}${t.season != null ? " " + esc(epLabel(t.season, t.episode)) : ""}</button>`
            : `<button class="btn primary" data-heroplay="${esc(t.id)}" ${tab}>${ic("play")} Play</button>`}
          <a class="btn secondary glass-btn-lg" href="${link}" ${tab}>More Info</a>
          ${t.cont && !TV ? `<button class="round-btn" data-hide="${esc(t.file_id)}" ${tab} aria-label="Remove from Continue Watching" title="Remove from Continue Watching">${ic("close")}</button>` : ""}
        </div>
      </div></div>`;
  }

  // New episodes for shows in My List, shown big at the top of Home so they're hard to miss
  function freshShelf(s) {
    return `<section class="shelf fresh" aria-label="${esc(s.title)}"><h2 class="section-title">${esc(s.title)}</h2>
      <div class="row fresh-row">${s.items.map((t) => `<a class="fresh-card" href="#/title/${t.id}" data-play="${t.file_id}" data-tid="${t.id}">
        <div class="fresh-bg">${t.thumbnail || t.background ? `<img loading="lazy" decoding="async" src="${img(t.thumbnail || t.background, 0, 640)}" alt="" data-fallback="hide">` : ""}</div>
        <div class="fresh-body">
          <span class="fresh-pill">${t.new_count} New Episode${t.new_count === 1 ? "" : "s"}</span>
          ${t.logo ? `<img class="fresh-logo" src="${img(t.logo, 1, LW())}" alt="${esc(t.name)}" data-fallback="text" data-cls="fresh-name">` : `<div class="fresh-name">${esc(t.name)}</div>`}
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
    // On tvs only the slide showing (and the one fading out) keep there big picture, five full width pictures
    // stacked up for the crossfade was a lot of memory for a fire tv
    const pics = (j) => $$(".hero-slide", hero)[j] ? $$(".hero-bg img, .hero-bg source", $$(".hero-slide", hero)[j]) : [];
    const park = (j) => pics(j).forEach((el) => { const a = el.tagName === "SOURCE" ? "srcset" : "src"; if (el.getAttribute(a) && !el.dataset.hsrc) { el.dataset.hsrc = el.getAttribute(a); el.setAttribute(a, el.tagName === "SOURCE" ? "" : BLANK); } });
    const wake = (j) => pics(j).forEach((el) => { const a = el.tagName === "SOURCE" ? "srcset" : "src"; if (el.dataset.hsrc) { el.setAttribute(a, el.dataset.hsrc); delete el.dataset.hsrc; } });
    if (LITE) for (let j = 1; j < n; j++) park(j);
    const show = (k) => {
      const prev = i;
      i = (k + n) % n;
      if (LITE) { wake(i); setTimeout(() => { for (let j = 0; j < n; j++) if (j !== i) park(j); }, 1600); }
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
    el.innerHTML = `${SYNC.poster ? `<img src="${img(SYNC.poster, 0, 342)}" alt="" data-fallback="hide">` : ""}
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
  // Long grids draw the first batch and add more as you get near the bottom, a few hundred posters at once was too
  // much for a fire tv
  const GRID_STEP = 48;
  function batch(grid, list) {
    let shown = Math.min(list.length, GRID_STEP);
    const more = () => {
      if (!grid.isConnected) { removeEventListener("scroll", more); return; }
      if (shown >= list.length || grid.getBoundingClientRect().bottom > innerHeight * 2.5) return;
      grid.insertAdjacentHTML("beforeend", list.slice(shown, shown + GRID_STEP).map(posterTile).join(""));
      shown = Math.min(list.length, shown + GRID_STEP);
    };
    if (grid._more) removeEventListener("scroll", grid._more);
    grid._more = more;
    addEventListener("scroll", more, { passive: true });
    grid.addEventListener("focusin", more);
  }

  async function pageBrowse(kind) {
    const n = ROUTE_N;
    const noun = kind === "movie" ? "movie" : "show";
    const first = await api(`/api/browse?kind=${kind}`);
    if (n !== ROUTE_N) return;
    const genres = first.genres || [];
    app.innerHTML = topbar(kind === "movie" ? "movies" : "shows") + `<main class="page">
      <h1 class="large-title">${kind === "movie" ? "Movies" : "TV Shows"}</h1>
      <div class="toolbar">
        <label class="search">${ic("search")}<span class="sr">Filter</span><input id="q" type="search" placeholder="Filter ${noun}s"></label>
        <select class="plain" id="sort" aria-label="Sort"><option value="added">Recently Added</option><option value="name">Name</option><option value="year">Newest</option><option value="old">Oldest</option><option value="rating">Rating</option></select>
        <select class="plain" id="decade" aria-label="Decade"><option value="">Any Year</option>${(first.decades || []).map((d) => `<option value="${d}">${d}s</option>`).join("")}</select>
        <select class="plain" id="minr" aria-label="Rating"><option value="">Any Rating</option><option value="6">6+ on IMDb</option><option value="7">7+ on IMDb</option><option value="8">8+ on IMDb</option></select>
        ${first.has_ext ? `<select class="plain" id="src" aria-label="Where"><option value="">Library and Addons</option><option value="lib">In Your Library</option><option value="ext">From Addons</option></select>` : ""}
        <span class="secondary" id="count" style="font-size:15px"></span>
      </div>
      ${genres.length ? `<div class="chips" role="group" aria-label="Genres"><button class="chip on" data-g="" aria-pressed="true">All Genres</button>${genres.map((g) => `<button class="chip" data-g="${esc(g)}" aria-pressed="false">${esc(g)}</button>`).join("")}</div>` : ""}
      <div class="grid" id="grid"></div>
      <div class="grid-more" id="gridMore" hidden><span class="spin small"></span>Loading more</div></main>`;
    wireTopbar();
    // Everything comes from the server a page at a time with the filters applied, and the next page loads as you get
    // near the bottom. Changing a filter starts again from the top
    const picked = [];
    const val = (id) => ($("#" + id) ? $("#" + id).value : "");
    let next = 0, seq = 0, busy = false, shown = 0;
    const query = () => `/api/browse?kind=${kind}&genres=${encodeURIComponent(picked.join(","))}&decade=${val("decade") || 0}&minr=${val("minr") || 0}&src=${val("src")}&sort=${val("sort")}&q=${encodeURIComponent(val("q").trim())}`;
    const put = (r, reset) => {
      const grid = $("#grid");
      if (reset) { grid.innerHTML = ""; shown = 0; window.scrollTo(0, 0); }
      if (!r.items.length && reset) grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h2>No matches</h2><p>Try a different filter or genre.</p></div>`;
      else grid.insertAdjacentHTML("beforeend", r.items.map(posterTile).join(""));
      shown += r.items.length;
      next = r.next;
      $("#count").textContent = `${shown}${next ? "+" : ""} ${noun}${shown === 1 ? "" : "s"}${r.library != null && val("src") !== "ext" ? ` · ${r.library} in your library` : ""}`;
      $("#gridMore").hidden = !next;
      if (LITE) recycleSoon();
      fill();
    };
    const load = async (reset) => {
      const my = reset ? ++seq : seq;
      if (busy && !reset) return;
      busy = true;
      try {
        const r = await api(query() + `&skip=${reset ? 0 : next}`);
        if (my === seq && n === ROUTE_N && $("#grid")) put(r, reset);
      } catch (_) {}
      busy = false;
    };
    // Keeps loading while the bottom of the grid is near the screen, so a big screen fills up straight away
    const fill = () => {
      const g = $("#grid");
      if (!g || !next || busy) return;
      if (g.getBoundingClientRect().bottom < innerHeight * 2.2) load(false);
    };
    const onScroll = () => { if (!$("#grid") || n !== ROUTE_N) { removeEventListener("scroll", onScroll); return; } fill(); };
    addEventListener("scroll", onScroll, { passive: true });
    $("#grid").addEventListener("focusin", fill);
    $$(".chip[data-g]").forEach((c) => (c.onclick = () => {
      const g = c.dataset.g;
      if (!g) picked.length = 0;
      else if (picked.includes(g)) picked.splice(picked.indexOf(g), 1);
      else picked.push(g);
      $$(".chip[data-g]").forEach((x) => { const on = x.dataset.g ? picked.includes(x.dataset.g) : !picked.length; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
      load(true);
    }));
    let qt;
    $("#q").addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(() => load(true), 300); });
    ["sort", "decade", "minr", "src"].forEach((id) => $("#" + id) && $("#" + id).addEventListener("input", () => load(true)));
    put(first, true);
  }

  // ---------------------------------------------------------- my list
  async function pageMyList() {
    const n = ROUTE_N;
    const r = await api("/api/mylist");
    if (n !== ROUTE_N) return;
    app.innerHTML = topbar("mylist") + `<main class="page"><h1 class="large-title">My List</h1>
      ${r.items.length ? `<div class="grid">${r.items.map((t) => posterTile(t).replace('<div class="art">', `<div class="art">${t.new_count ? `<span class="new-dot">${t.new_count} New</span>` : ""}`)).join("")}</div>`
        : `<div class="empty"><h2>Nothing in your list yet</h2><p>Use the + button on any film or show to keep it here.</p></div>`}</main>`;
    wireTopbar();
  }

  // ---------------------------------------------------------- search
  // Results come in rows like apple tv: Movies, TV Shows, People and Episodes. Library and addon results are mixed
  // into the same rows and sorted by how well they match plus how popular they are, the best row goes first
  // Rows only draw the first few results and add more as you scroll or move along them, so a search with lots of
  // results is quick to show and light on a tv
  const SROWS = {};
  let HAS_VIDEO_ADDON = true;  // goes false once the server says no addon searches videos
  const SROW_STEP = 14;
  // Channels and live events in search, they play straight away
  let SEARCH_EMBEDS = [];
  const liveSearchTile = (x) => x.player ? `<a class="tile landscape" href="#/live" data-embs="${SEARCH_EMBEDS.indexOf(x)}"><div class="art">${x.image ? `<img loading="lazy" decoding="async" src="${img(x.image, 0, WW())}" alt="" data-fallback="ph">` : `<div class="ph" style="--h:${hue(x.title)}">${esc(x.title)}</div>`}${x.live ? `<span class="tile-live">Live</span>` : ""}</div>
      <div class="cap">${esc(x.title)}</div><div class="sub">${esc([x.source, x.category].filter(Boolean).join(" · "))}</div></a>`
    : x.live_id ? liveTile(x) : `<a class="tile landscape ch-tile" href="#/live" data-live="${esc(x.id)}" data-name="${esc(x.name)}"><div class="art">${x.logo ? `<img loading="lazy" decoding="async" src="${img(x.logo, 1, 240)}" alt="" data-fallback="ph">` : `<div class="ph" style="--h:${hue(x.name)}">${esc(x.name)}</div>`}<span class="tile-live">Live</span></div>
      <div class="cap">${esc(x.name)}</div><div class="sub">${esc(x.now ? x.now.title : [x.group, flag(x.country)].filter(Boolean).join(" · "))}</div></a>`;
  const tileFor = (tile) => (tile === "wide" ? epTile : tile === "person" ? personTile : tile === "video" ? wideTile : tile === "live" ? liveSearchTile : posterTile);
  const searchRow = (id, title, items, tile) => {
    if (!items.length) return "";
    SROWS[id] = { items, tile, shown: Math.min(items.length, SROW_STEP) };
    return `<section class="shelf srow" data-srow="${id}" aria-label="${esc(title)}">
      <h2 class="section-title">${esc(title)} <span class="from">${items.length}</span></h2>
      <div class="row ${tile === "wide" || tile === "video" || tile === "live" ? "wide" : "posters"}">${items.slice(0, SROW_STEP).map(tileFor(tile)).join("")}</div></section>`;
  };
  function growRows(box) {
    $$(".srow", box).forEach((sec) => {
      const row = $(".row", sec), st = SROWS[sec.dataset.srow];
      if (!row || !st) return;
      const more = () => {
        if (st.shown >= st.items.length || row.scrollWidth - row.scrollLeft - row.clientWidth > row.clientWidth * 1.2) return;
        row.insertAdjacentHTML("beforeend", st.items.slice(st.shown, st.shown + SROW_STEP).map(tileFor(st.tile)).join(""));
        st.shown = Math.min(st.items.length, st.shown + SROW_STEP);
      };
      row.addEventListener("scroll", more, { passive: true });
      row.addEventListener("focusin", more);
      more();
    });
  }
  const epTile = (e) => `<a class="tile landscape" href="#/title/${e.title_id}" data-play="${e.file_id}" data-tid="${e.title_id}"><div class="art">${e.thumbnail ? `<img loading="lazy" decoding="async" src="${img(e.thumbnail, 0, WW())}" alt="${esc(e.name)}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(e.show)}">${esc(e.name)}</div>`}<span class="tile-play">${ic("play")}</span></div>
      <div class="cap">${esc(nice(e.name))}</div><div class="sub">${esc(e.show)} · ${esc(epLabel(e.season, e.episode))}</div></a>`;
  const personTile = (p) => `<a class="tile person" href="#/person/${encodeURIComponent(p.name)}"><div class="art">${p.poster ? `<img loading="lazy" decoding="async" src="${img(p.poster, 0, PW())}" alt="" data-fallback="hide">` : ""}<span class="person-ic">${ic("person")}</span></div>
      <div class="cap">${esc(p.name)}</div><div class="sub">${esc(p.role)} · ${p.count} title${p.count === 1 ? "" : "s"}</div></a>`;

  async function pageSearch() {
    const n = ROUTE_N;
    const start = safeDecode(location.hash.split("?q=")[1] || "");
    app.innerHTML = topbar("search") + `<main class="page">
      <form class="search big" id="sForm" role="search" action="#">${ic("search")}<label class="sr" for="sq">Search</label><input id="sq" type="search" enterkeyhint="search" placeholder="Films, shows, actors, directors and more" value="${esc(start)}" autocomplete="off">
        <button class="mic-btn" id="micBtn" type="button" aria-label="Search by Voice" title="Search by Voice" hidden>${ic("mic")}</button></form>
      <div id="sres"></div></main>`;
    wireTopbar();
    const input = $("#sq");
    if (!TV) input.focus();
    setupMic(input, () => run());
    let t, seq = 0, ctl = null;
    const run = async () => {
      const q = input.value.trim();
      history.replaceState(null, "", "#/search" + (q ? "?q=" + encodeURIComponent(q) : ""));
      const box = $("#sres");
      if (!q) { ++seq; if (ctl) ctl.abort(); return drawStart(box); }
      const my = ++seq;
      if (ctl) ctl.abort();
      const sc = ctl = new AbortController();
      box.innerHTML = `<div class="sk sk-line" style="width:200px;margin-top:32px"></div><div class="row posters">${Array.from({ length: 8 }, () => '<div class="sk sk-poster"></div>').join("")}</div>`;
      let r;
      try { r = await api("/api/search?q=" + encodeURIComponent(q), undefined, undefined, sc.signal); }
      catch (e) {
        if (sc.signal.aborted || my !== seq || n !== ROUTE_N || !$("#sres") || e.message === "pick profile") return;
        box.innerHTML = `<div class="empty"><h2>Search failed</h2><p>${esc(e.message)}. Check your connection and try again.</p></div>`;
        return;
      }
      if (my !== seq || n !== ROUTE_N || !$("#sres")) return;
      let ext = [], extDone = false, vids = [], vidsDone = !HAS_VIDEO_ADDON;
      const draw = () => {
        const all = r.titles.concat(ext).sort((a, b) => (b.score || 0) - (a.score || 0));
        const movies = all.filter((x) => x.kind === "movie"), shows = all.filter((x) => x.kind === "series");
        // Movies always first, then TV Shows, like the sidebar
        const rows = [searchRow("movies", "Movies", movies), searchRow("shows", "TV Shows", shows)];
        // When the addon results land the page redraws, focus and how far each row was scrolled stay put
        const k = focusKey(document.activeElement), keep = {};
        $$(".srow", box).forEach((sec) => (keep[sec.dataset.srow] = $(".row", sec).scrollLeft));
        const people = searchRow("people", "Cast and Crew", r.people || [], "person");
        // Someone typing an actor's name wants the people first
        const peopleFirst = (r.people || []).length && (!all.length || (all[0].score || 0) < 60);
        // Youtubio and the like come in last, there own rows with videos and channels kept apart
        const vrows = searchRow("vids", "Videos", vids.filter((x) => x.shape !== "square"), "video") + searchRow("chans", "Channels", vids.filter((x) => x.shape === "square"), "video");
        SEARCH_EMBEDS = r.embeds || [];
        const liveRow = searchRow("live", "Live TV", [...(r.channels || []), ...SEARCH_EMBEDS, ...ext.filter((x) => x.kind === "live")], "live");
        box.innerHTML = ((peopleFirst ? [people, ...rows] : [...rows, people]).join("") + liveRow + searchRow("eps", "Episodes", r.episodes, "wide") + vrows
          + (!extDone || !vidsDone ? `<div class="s-more"><span class="spin small"></span>${!extDone ? "Looking in your addons" : "Still looking for videos"}</div>` : ""))
          || `<div class="empty"><h2>Nothing found for “${esc(q)}”</h2><p>Check the spelling or try an actor, director or genre.</p></div>`;
        growRows(box);
        enhanceRows(box);
        $$(".srow", box).forEach((sec) => { if (keep[sec.dataset.srow]) $(".row", sec).scrollLeft = keep[sec.dataset.srow]; });
        refocus(k);
      };
      draw();
      api("/api/search/addons?q=" + encodeURIComponent(q)).then((x) => { if (my !== seq || !$("#sres")) return; ext = x.external; extDone = true; draw(); })
        .catch(() => { extDone = true; if (my === seq && $("#sres")) draw(); });
      if (HAS_VIDEO_ADDON) api("/api/search/addons?videos=1&q=" + encodeURIComponent(q)).then((x) => { if (my !== seq || !$("#sres")) return; vids = x.external; vidsDone = true; if (x.none) HAS_VIDEO_ADDON = false; draw(); })
        .catch(() => { vidsDone = true; if (my === seq && $("#sres")) draw(); });
    };
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, TV ? 450 : 220); });
    // Search on the keyboard (the fire tv keyboard's go button, or play pause) searches straight away and closes it
    $("#sForm").addEventListener("submit", (e) => {
      e.preventDefault();
      clearTimeout(t);
      input.blur();
      run().then(() => { if (TV) { const f = $("#sres .tile"); if (f) f.focus(); } });
    });
    $("#sres").addEventListener("click", async (e) => {
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
      const body = m ? { title_id: m[1] } : d ? { kind: safeDecode(d[1]), id: safeDecode(d[2]), name, poster: a.dataset.poster || null } : null;
      if (body) api("/api/search/recent", body).catch(() => {});
    });
    run();
  }
  const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

  // Everything in the library with one actor or director
  async function pagePerson(name) {
    const n = ROUTE_N;
    const r = await api("/api/person?name=" + encodeURIComponent(name));
    if (n !== ROUTE_N) return;
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
    const n = ROUTE_N;
    const t = await api(`/api/title/${id}`);
    if (n !== ROUTE_N) return;
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
        <div class="hero-trailer" id="heroTrailer" aria-hidden="true"></div>
        <button type="button" class="round-btn hero-mute" id="heroMute" aria-label="Sound on" title="Sound on" hidden>${ic("mute")}</button>
        <div class="hero-content" style="z-index:2">
          ${t.logo ? `<img class="hero-logo" src="${img(t.logo, 1, LW())}" alt="${esc(t.name)}" data-fallback="text">` : `<h1 class="hero-name">${esc(t.name)}</h1>`}
          <div class="hero-meta">${metaLine(t).map((m, i) => `<span class="${i ? "dot-sep" : ""}">${esc(m)}</span>`).join("")}</div>
          ${allBadges.length ? `<div class="badges" style="margin-bottom:16px">${allBadges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}</div>` : ""}
          ${t.description ? `<p class="hero-desc" style="-webkit-line-clamp:4">${esc(t.description)}</p>` : ""}
          <div class="actions">
            ${up ? `<button class="btn primary" id="playMain">${ic("play")} ${esc(playLabel)}</button>` : ""}
            ${resume ? `<button class="btn secondary" id="playStart">Start Over</button>` : ""}
            ${up && t.imdb ? `<button class="btn secondary" id="srcMain">${ic("link")} Sources</button>` : ""}
            ${t.imdb ? `<button class="btn secondary" id="trailerBtn" type="button" hidden>${ic("trailer")} Trailer</button>` : ""}
            ${listBtn(t.in_list)}
            <button class="round-btn ${t.watched ? "on" : ""}" id="watchedBtn" aria-pressed="${t.watched}" aria-label="${t.watched ? "Mark as unwatched" : "Mark as watched"}" title="${t.watched ? "Watched" : "Mark as Watched"}">${ic(t.watched ? "check" : "eye")}</button>
            <span class="rate-group" role="group" aria-label="Rate this">${rateBtn(-1, "down", "Not for me")}${rateBtn(1, "up", "I like this")}${rateBtn(2, "love", "Love this")}</span>
            ${inCont ? `<button class="round-btn" id="contHide" aria-label="Remove from Continue Watching" title="Remove from Continue Watching">${ic("close")}</button>` : ""}
            ${t.kind === "movie" && up && !TV && !kidsMode() ? `<button class="round-btn" id="dlMain" aria-label="Download" title="Download">${ic("download")}</button>` : ""}
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
    if (!SOFT) window.scrollTo(0, 0);

    const drawEps = (season) => {
      const eps = t.files.filter((f) => (f.season ?? 0) === season);
      $("#eps").innerHTML = eps.map((f) => {
        const p = f.progress && f.progress.dur ? f.progress.pos / f.progress.dur : null;
        const art = f.thumbnail ? `<img loading="lazy" decoding="async" src="${img(f.thumbnail, 0, WW())}" alt="${esc(f.ep_name || f.name)}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(t.name)}">${esc(epLabel(f.season, f.episode))}</div>`;
        return `<div class="ep"><button class="tile landscape ${f.watched ? "is-watched" : ""}" data-playfile="${f.id}" aria-label="Play ${esc(epLabel(f.season, f.episode))} ${esc(f.ep_name || "")}"><div class="art">${art}${p != null ? `<div class="bar"><i style="width:${Math.min(100, p * 100)}%"></i></div>` : ""}${f.watched ? `<span class="tile-check">${ic("check")}</span>` : ""}<span class="tile-play">${ic("play")}</span></div></button>
          <div class="ep-row"><div class="num">${esc(epLabel(f.season, f.episode) || "Extra")}${f.duration ? ` · ${Math.max(1, Math.round(f.duration / 60))} min` : ""}</div>
            ${t.imdb ? `<button class="ep-mark" data-epsrc="${f.id}" aria-label="Other sources for ${esc(epLabel(f.season, f.episode))}" title="Sources">${ic("link")}</button>` : ""}
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
      $$("[data-epsrc]").forEach((b) => (b.onclick = () => openSources(t, t.files.find((x) => x.id === b.dataset.epsrc))));
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
    const sm = $("#srcMain");
    if (sm) sm.onclick = () => openSources(t, up);
    heroTrailer(t.kind, t.imdb);
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
      const setM = (on) => {
        menu.hidden = !on; hero.classList.toggle("menu-open", on); am.setAttribute("aria-expanded", on);
        // With the big banner the button sits near the bottom of a tv screen, so the menu opens upwards when theres no room under it
        menu.classList.remove("flip", "to-left");
        // Opens to the right of the button, on narrow screens that runs off the edge so it opens leftwards instead
        if (on && menu.getBoundingClientRect().right > innerWidth - 8) menu.classList.add("to-left");
        if (on && menu.getBoundingClientRect().bottom > innerHeight - 8) {
          // Flipping up only helps if theres room above, on a short landscape phone there isnt so it stays below and the page scrolls
          const r = menu.getBoundingClientRect();
          if (am.getBoundingClientRect().top - r.height > 8) menu.classList.add("flip");
          else menu.scrollIntoView({ block: "nearest" });
        }
        // On a tv the remote goes straight into the menu, wherever it opened
        if (on && TV) setTimeout(() => { const f = $(".mi", menu); if (f) f.focus({ preventScroll: true }); }, 30);
      };
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
    const n = ROUTE_N;
    const nm = EXT_NAME.get(`${kind}/${id}`) || "";
    const q = [location.hash.includes("?all=1") ? "stay=1" : "", nm ? "name=" + encodeURIComponent(nm) : ""].filter(Boolean).join("&");
    const t = await api(`/api/external/${encodeURIComponent(kind)}/${encodeURIComponent(id)}${q ? "?" + q : ""}`);
    if (n !== ROUTE_N) return;
    if (t.library_id) { location.replace(`#/title/${t.library_id}`); return; }
    if (kind !== "movie" && kind !== "series") return pageVideo(kind, id, t);
    const facts = metaLine({ ...t, kind });
    app.innerHTML = topbar(kind === "series" ? "shows" : "movies") + backBtn() + `
      <section class="detail-hero">
        <div class="hero-bg ${t.poster ? "has-tall" : ""}">${heroArt(t)}</div>
        <div class="hero-trailer" id="heroTrailer" aria-hidden="true"></div>
        <button type="button" class="round-btn hero-mute" id="heroMute" aria-label="Sound on" title="Sound on" hidden>${ic("mute")}</button>
        <div class="hero-content" style="z-index:2">
          ${t.logo ? `<img class="hero-logo" src="${img(t.logo, 1, LW())}" alt="${esc(t.name)}" data-fallback="text">` : `<h1 class="hero-name">${esc(t.name)}</h1>`}
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
    heroTrailer(kind, String(id).split(":")[0]);
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
        const art = v.thumbnail ? `<img loading="lazy" decoding="async" src="${img(v.thumbnail, 0, WW())}" alt="${esc(v.name || "")}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(t.name)}">${esc(epLabel(v.season, v.episode))}</div>`;
        return `<div class="ep"><button class="tile landscape ${v.progress && v.progress.watched ? "is-watched" : ""}" data-playep="${esc(v.id)}" aria-label="Play ${esc(epLabel(v.season, v.episode))} ${esc(v.name || "")}"><div class="art">${art}${pr != null ? `<div class="bar"><i style="width:${Math.min(100, pr * 100)}%"></i></div>` : ""}${v.progress && v.progress.watched ? `<span class="tile-check">${ic("check")}</span>` : ""}<span class="tile-play">${ic("play")}</span></div></button>
          <div class="ep-row"><div class="num">${esc(epLabel(v.season, v.episode))}</div>
            ${isAdmin() ? `<button class="ep-mark" data-saveep="${esc(v.id)}" aria-label="Save to Library" title="Save to Library">${ic("download")}</button>` : ""}</div>
          <div class="cap">${esc(nice(v.name) || epLabel(v.season, v.episode))}</div>${v.overview ? `<div class="ov">${esc(v.overview)}</div>` : ""}</div>`;
      }).join("");
      $$("[data-playep]").forEach((b) => (b.onclick = () => playEpisode(b.dataset.playep, t.videos.find((v) => v.id === b.dataset.playep))));
      $$("[data-saveep]").forEach((b) => (b.onclick = () => saveEpisode(b.dataset.saveep, t)));
    };
    // The seasons and episodes wait for the Play button and the sources, so the page doesn't fill in the bottom while the top is still
    // loading. They show as placeholders until then (and by 10 seconds at the latest, when a slow addon is still being asked)
    $("#extSeasons").innerHTML = `<span class="sk sk-btn short" aria-hidden="true"></span>`;
    $("#eps").setAttribute("aria-busy", "true");
    $("#eps").innerHTML = Array.from({ length: 4 }, () => `<div class="ep" aria-hidden="true"><div class="sk" style="aspect-ratio:16/9;border-radius:14px"></div><div class="sk sk-line" style="width:60%;margin-top:10px"></div></div>`).join("");
    let shown = false;
    const reveal = () => {
      if (shown || n !== ROUTE_N || !$("#eps")) return;
      shown = true;
      $("#eps").removeAttribute("aria-busy");
      $("#extSeasons").innerHTML = seasonPick(t.season_list, target.season, t.videos);
      $("#seasonPick").onchange = (e) => drawEps(Number(e.target.value));
      drawEps(target.season);
    };
    const wait = setTimeout(reveal, 10000);
    drawStreams(kind, target.id, t, target).catch(() => {}).finally(() => { clearTimeout(wait); reveal(); });
  }

  // A video from youtubio or another addon with its own kind of stuff. One video goes straight to its sources like a
  // film, a channel or playlist lists its videos underneath
  function pageVideo(kind, id, t) {
    const facts = [t.channel, t.releaseInfo, t.runtime].filter(Boolean);
    const list = t.videos || [];
    app.innerHTML = topbar("home") + backBtn() + `
      <section class="detail-hero vid-hero">
        <div class="hero-bg">${heroArt({ ...t, poster: null })}</div>
        <div class="hero-content" style="z-index:2">
          <h1 class="hero-name">${esc(t.name)}</h1>
          ${facts.length ? `<div class="hero-meta">${facts.map((m, i) => `<span class="${i ? "dot-sep" : ""}">${esc(m)}</span>`).join("")}</div>` : ""}
          ${t.description ? `<p class="hero-desc" style="-webkit-line-clamp:3">${esc(t.description)}</p>` : ""}
          <div id="pdBox" aria-busy="true"><span class="sr">Looking for a copy to play</span><div class="actions pd-skel" aria-hidden="true"><span class="sk sk-btn"></span><span class="sk sk-btn short"></span><span class="sk sk-round"></span></div></div>
        </div>
      </section>
      <main class="page under-hero" style="padding-top:12px">
        ${list.length ? `<section class="section" style="margin-top:0"><h2 class="section-title">Videos <span class="from">${list.length}</span></h2><div class="episodes vid-list" id="eps"></div></section>` : ""}
        ${t.genres?.length ? `<section class="section"><div class="facts"><div><h4>Tags</h4><p>${esc(t.genres.join(", "))}</p></div></div></section>` : ""}
      </main>`;
    wireTopbar();
    if (t.single) return drawStreams(kind, t.single, t);
    const lb = listBtn(t.in_list);
    const started = list.filter((v) => v.progress && !v.progress.watched).sort((a, b) => b.progress.updated - a.progress.updated)[0];
    const first = started || list[0];
    $("#pdBox").removeAttribute("aria-busy");
    $("#pdBox").innerHTML = `<div class="actions">${first ? `<button class="btn primary" id="vPlay">${ic("play")} ${started ? "Resume" : "Play Latest"}</button>` : ""}${lb}</div>`;
    wireListBtn({ kind, id: t.list_key }, t.list_key);
    if (first) $("#vPlay").onclick = () => playEpisode(first.id, first, kind);
    if (TV && (document.activeElement === document.body || document.activeElement === AUTO_FOCUS)) { const f = $("#vPlay") || $("#listBtn"); if (f) f.focus({ preventScroll: true }); }
    if (!list.length) return;
    $("#eps").innerHTML = list.map((v) => {
      const pr = v.progress && v.progress.dur ? v.progress.pos / v.progress.dur : null;
      const art = v.thumbnail ? `<img loading="lazy" decoding="async" src="${img(v.thumbnail, 0, WW())}" alt="${esc(v.name || "")}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(v.name || t.name)}">${esc(v.name || "")}</div>`;
      const day = v.released ? new Date(v.released) : null;
      return `<div class="ep"><button class="tile landscape ${v.progress && v.progress.watched ? "is-watched" : ""}" data-playv="${esc(v.id)}" aria-label="Play ${esc(v.name || "")}"><div class="art">${art}${pr != null ? `<div class="bar"><i style="width:${Math.min(100, pr * 100)}%"></i></div>` : ""}${v.progress && v.progress.watched ? `<span class="tile-check">${ic("check")}</span>` : ""}<span class="tile-play">${ic("play")}</span></div></button>
        <div class="cap">${esc(nice(v.name) || "Video")}</div>${day && !isNaN(day) && day.getFullYear() > 1971 ? `<div class="ov">${esc(day.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }))}</div>` : ""}</div>`;
    }).join("");
    $$("[data-playv]").forEach((b) => (b.onclick = () => playEpisode(b.dataset.playv, list.find((v) => v.id === b.dataset.playv), kind)));
  }

  // Finds the public domain copy of one episode and plays it
  async function playEpisode(vid, v, kind = "series") {
    let r;
    toast("Getting it ready", 2500);
    try { r = await api(`/api/streams/${encodeURIComponent(kind)}/${encodeURIComponent(vid)}`); } catch (e) { toast(e.message, 5000); return false; }
    if (r.upcoming) { toast(`Not out yet, comes out on ${new Date(r.upcoming + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long" })}`, 5000); return false; }
    if (!r.streams.length) { toast(kind === "series" ? "There's no public domain copy of this episode" : "The addon didn't send anything Kino can play for that"); return false; }
    const s = r.streams[0];
    SOURCES = { list: liveSources(r.streams), tried: new Set(), skips: 0, busyHosts: new Set(), busy: false };
    playFile(s.id, { from: s.progress && !s.progress.watched ? s.progress.pos : 0 });
    return true;
  }

  // What to say about a film that is too new to have a real HD copy yet (the server works the window out from the kind of film)
  const tooNewText = (t, dayOf) => `This film came out ${t.age} day${t.age === 1 ? "" : "s"} ago. A real HD copy usually isn't around until about ${t.window} days after release (about ${t.left} more day${t.left === 1 ? "" : "s"}, around ${dayOf(t.from)}), so HD sources before then are probably fakes or camera recordings. The best of what there is is tried first.`;

  // The sources a title or episode was played from. When one turns out broken it gets marked on the server (so it
  // goes to the back of the list next time) and the next one plays straight away, instead of asking about players
  let SOURCES = null;
  // The ones the server found dead (no answer, an error, not a video) stay out of the list the player moves through by itself, unless nothing else is left
  const liveSources = (list) => { const ok = list.filter((x) => x.health !== "dead" && !(x.suspect && x.suspect.length) && !x.slow); return ok.length ? ok : list.filter((x) => x.health !== "dead").length ? list.filter((x) => x.health !== "dead") : list; };
  const moreSources = (fid) => !!(SOURCES && SOURCES.list.some((x) => x.id !== fid && !SOURCES.tried.has(x.id)));
  function nextSource(fid, from, why) {
    // The server says if the source's host was just busy (429, too many requests), that isnt the source being broken so it isnt held against it,
    // and sources on that host wait while others are tried
    api(`/api/streams/${fid}/bad`, {}).then((r) => { if (r && r.busy && SOURCES) { SOURCES.busyHosts.add(r.host); SOURCES.busy = true; } }).catch(() => {});
    if (!SOURCES || !SOURCES.list.some((x) => x.id === fid)) return false;
    SOURCES.tried.add(fid);
    SOURCES.skips = (SOURCES.skips || 0) + 1;
    if (/busy|429|too many/i.test(why || "")) { SOURCES.busy = true; const h = (SOURCES.list.find((x) => x.id === fid) || {}).host; if (h) SOURCES.busyHosts.add(h); }
    const untried = SOURCES.list.filter((x) => !SOURCES.tried.has(x.id));
    // Sources on a host that is busy come last
    const n = untried.find((x) => !SOURCES.busyHosts.has(x.host)) || untried[0];
    if (!n || SOURCES.skips > 8) {
      toast(!n && SOURCES.busy ? "The source servers are busy right now (too many requests). Give it a minute and try again." : n ? "A lot of the sources aren't working right now. Try again in a bit, or pick one from the Sources list yourself." : "None of the sources for this would play. Try again later, or another player from the player's menu.", 7000);
      return false;
    }
    // Only the first skip says so in a toast, the ones after it show on the loading screen so a run of dead sources isnt a run of popups
    const left = untried.length - 1;
    const note = `${SOURCES.busy ? "That source is busy" : why || "That source didn't work"}, trying ${n.addon ? `one from ${n.addon}` : "another one"}`;
    if (SOURCES.skips === 1) toast(note, 4000);
    // A dead source answers in a blink, so each try waits a second at least (longer when a host is busy, hitting it again just makes it worse).
    // The loading screen stays up and its line says what is happening
    const tok = PLAY_N, gap = SOURCES.busyHosts.has(n.host) ? 4000 : SOURCES.busy ? 2000 : 1000, wait = Math.max(0, gap - (Date.now() - (SOURCES.lastAt || 0)));
    SOURCES.lastAt = Date.now() + wait;
    if (LOAD.on) loadStep(SOURCES.skips > 1 ? `${note} (${left} left)` : note);
    const go = () => { if (PLAY_N !== tok) return; playFile(n.id, { from: from || 0, note: SOURCES.skips > 1 ? `${note} (${left} left)` : "", chain: true }); };
    if (wait) SOURCES.timer = setTimeout(go, wait); else go();
    return true;
  }

  async function saveEpisode(vid, t) {
    const r = await api(`/api/streams/series/${encodeURIComponent(vid)}`).catch(() => ({ streams: [] }));
    if (!r.streams.length) { toast("There's no public domain copy of this episode"); return; }
    try { await api(`/api/admin/streams/${r.streams[0].id}/save`, {}); toast(`Saving to the Library`); watchSave(r.streams[0].id, true); }
    catch (e) { toast(e.message, 5000); }
  }

  // Public domain copies from addons, the server only hands back ones that are actually on archive.org
  async function drawStreams(kind, id, t, ep, got) {
    const box = $("#pdBox");
    const none = `<div class="not-lib glass" style="margin-top:14px">${ic("info")}<span>${kind === "movie" || kind === "series" ? "Not in Your Library" : "Nothing Kino Can Play"}</span></div>`;
    const dayOf = (d) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    const url = `/api/streams/${kind}/${encodeURIComponent(id)}`;
    let r = got;
    // First whatever answers in a few seconds (TorBox and the quick addons) so Play shows straight away, then the
    // slow addons fill in the rest of the sources behind it
    if (!r) { try { r = await api(url + "?quick=1"); } catch (_) { r = { streams: [] }; } }
    if (!$("#pdBox") || $("#pdBox") !== box) return;
    if (r.partial) {
      if (!r.streams.length) { try { r = await api(url); } catch (_) {} if (!$("#pdBox") || $("#pdBox") !== box) return; }
      else api(url).then((r2) => { if ($("#pdBox") === box && r2.streams.length > r.streams.length && !sheetClose) drawStreams(kind, id, t, ep, r2); }).catch(() => {});
    }
    const lb = listBtn(t.in_list);
    // Not out yet: whatever is on offer for it is fake, so nothing is shown to play
    if (r.upcoming) {
      box.innerHTML = `<div class="actions">${lb}</div><div class="not-lib glass" style="margin-top:14px">${ic("info")}<span>Not out yet, comes out on ${esc(dayOf(r.upcoming))}</span></div>`;
      wireListBtn({ kind, id: t.list_key }, t.list_key); addTrailerButton(kind, id, box);
      return;
    }
    if (!r.streams.length) {
      // Admins get told why nothing can play, so a missing addon or a slow archive.org is easy to spot
      let why = "";
      if (isAdmin() && r.report) {
        if (!r.report.length) why = r.stream_addons && r.stream_addons.length ? `None of your stream addons (${r.stream_addons.join(", ")}) handle this title.` : "No addon with streams is installed. Install the Archive.org addon to play public domain films.";
        else why = r.report.map((x) => x.error ? `${x.addon} ${x.error}.` : !x.found ? `${x.addon} found nothing for this title.`
          : `${x.addon} found ${x.found}, but none could be used${x.other.length ? ` (${x.other.join(", ")})` : ""}.`).join(" ");
      }
      box.innerHTML = `<div class="actions">${lb}</div>` + none + (why ? `<div class="note pd-note">${ic("info")} ${esc(why)}</div>` : "");
      wireListBtn({ kind, id: t.list_key }, t.list_key); addTrailerButton(kind, id, box);
      if (TV && (document.activeElement === document.body || document.activeElement === AUTO_FOCUS)) { const lbb = $("#listBtn"); if (lbb) lbb.focus({ preventScroll: true }); }
      return;
    }
    const first = r.streams[0];
    const res = first.progress && !first.progress.watched && first.progress.pos > 30 ? first.progress : null;
    const grabFocus = TV && (document.activeElement === document.body || document.activeElement === AUTO_FOCUS || !document.activeElement);
    box.innerHTML = `<div class="actions">
        <button class="btn primary" id="pdPlay">${ic("play")} ${res ? "Resume" : "Play"}${ep ? " " + esc(epLabel(ep.season, ep.episode)) : ""}</button>
        ${r.streams.length > 1 ? `<button class="btn secondary" id="pdMore">${r.streams.length} Sources</button>` : ""}
        ${lb}
        ${isAdmin() && (kind === "movie" || kind === "series") ? `<button class="round-btn" id="pdSave" aria-label="Save to Library" title="Save to Library">${ic("download")}</button>` : ""}
      </div>
      ${r.too_new ? `<div class="note pd-note">${ic("info")} ${esc(tooNewText(r.too_new, dayOf))}</div>` : r.fresh ? `<div class="note pd-note">${ic("info")} This only just came out. Some sources can be camera recordings or fakes until it is properly released, the better ones are tried first.</div>` : ""}
      ${res ? `<div class="progress thin" style="max-width:280px;margin-top:16px"><i style="width:${(res.pos / res.dur) * 100}%"></i></div><div class="note">${clock(res.dur - res.pos)} left</div>` : ""}`;
    const play = (s) => { SOURCES = { list: liveSources(r.streams), tried: new Set(), skips: 0, busyHosts: new Set(), busy: false }; playFile(s.id, { from: s.progress && !s.progress.watched ? s.progress.pos : 0 }); };
    $("#pdPlay").onclick = () => play(first);
    if (grabFocus) $("#pdPlay").focus({ preventScroll: true });
    wireListBtn({ kind, id: t.list_key }, t.list_key); addTrailerButton(kind, id, box);
    const more = $("#pdMore");
    if (more) more.onclick = () => {
      const sh = sheet(`<div class="src-head"><div><h2>Sources</h2><p class="secondary">${esc(t.name)}${ep ? ` · ${esc(epLabel(ep.season, ep.episode))}` : ""}</p></div>
          <button class="round-btn sm" data-close aria-label="Close">${ic("close")}</button></div>
        <div class="src-list">${r.streams.map((s, i) => {
          const p = s.progress && !s.progress.watched && s.progress.dur ? s.progress.pos / s.progress.dur : 0;
          const meta = [s.format, s.bytes ? bytes(s.bytes) : "", s.seeders != null ? `${s.seeders} seeder${s.seeders === 1 ? "" : "s"}` : "", s.peers != null ? `${s.peers} peer${s.peers === 1 ? "" : "s"}` : "", s.addon, s.tier].filter(Boolean);
          return `<button class="src ${i === 0 ? "best" : ""} ${s.health === "dead" ? "dead" : ""}" data-src="${i}">
            <span class="src-q ${s.height >= 720 ? "hd" : ""}">${esc(s.quality)}</span>
            <span class="src-body"><b>${esc(nice(s.label))}</b>
              <span class="src-meta">${meta.map((m) => `<span>${esc(m)}</span>`).join("")}</span>
              ${s.health === "dead" ? `<span class="src-warn">${ic("info")} Not answering right now${s.why ? `, it ${esc(s.why)}` : ""}</span>` : ""}
              ${s.slow ? `<span class="src-warn">${ic("info")} Slow to start: ${esc(s.slow)}</span>` : ""}
              ${s.suspect && s.suspect.length ? `<span class="src-warn">${ic("info")} Probably not the real thing: ${esc(s.suspect.join(", "))}</span>` : ""}
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

  // Sources for something that is in the Library already. The Storage Box copy is listed first and the sources from addons (and your
  // TorBox) come after it, so a title in the Library doesnt hide the other ways to watch it. file is the episode (nothing for a film)
  async function openSources(t, file) {
    const ep = t.kind === "series" && file ? file : null;
    const vid = t.kind === "series" ? (ep ? `${t.imdb}:${ep.season}:${ep.episode}` : null) : t.imdb;
    if (!vid) return;
    const own = t.files.filter((f) => !ep || (f.season === ep.season && f.episode === ep.episode));
    const head = `<div class="src-head"><div><h2>Sources</h2><p class="secondary">${esc(t.name)}${ep ? ` · ${esc(epLabel(ep.season, ep.episode))}` : ""}</p></div>
      <button class="round-btn sm" data-close aria-label="Close">${ic("close")}</button></div>`;
    const sh = sheet(head + `<div class="src-list" id="srcList"></div>`, { wide: true });
    const list = $("#srcList", sh.el);
    let streams = null, err = "", tooNew = null;
    const dayOf2 = (d) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    const draw = (loading) => {
      list.innerHTML = `<h3 class="sr-sub">On the Storage Box</h3>` + (own.map((f, i) => {
        const p = f.progress && !f.watched && f.progress.dur ? f.progress.pos / f.progress.dur : 0;
        return `<button class="src ${i === 0 ? "best" : ""}" data-own="${f.id}">
          <span class="src-q ${/2160|1080|720|4k/i.test(f.name) ? "hd" : ""}">${esc((f.name.match(/\b(2160p|1440p|1080p|720p|576p|480p)\b/i) || (/\b4k\b/i.test(f.name) ? ["4K"] : ["Library"]))[0])}</span>
          <span class="src-body"><b>${esc(nice(f.name))}</b><span class="src-meta"><span>${bytes(f.size)}</span><span>Storage Box</span></span>
            ${p > 0.02 ? `<span class="src-prog"><i style="width:${p * 100}%"></i></span>` : ""}</span>
          <span class="src-play">${ic("play")}</span></button>`;
      }).join("") || `<p class="secondary sr-empty">Not on the Storage Box.</p>`)
        + `<h3 class="sr-sub">From Addons</h3>` + (tooNew ? `<div class="note pd-note">${ic("info")} ${esc(tooNewText(tooNew, dayOf2))}</div>` : "") + (streams ? (streams.length ? streams.map((x, i) => {
        const p = x.progress && !x.progress.watched && x.progress.dur ? x.progress.pos / x.progress.dur : 0;
        const meta = [x.format, x.bytes ? bytes(x.bytes) : "", x.seeders != null ? `${x.seeders} seeder${x.seeders === 1 ? "" : "s"}` : "", x.peers != null ? `${x.peers} peer${x.peers === 1 ? "" : "s"}` : "", x.addon, x.tier].filter(Boolean);
        return `<button class="src ${x.health === "dead" ? "dead" : ""}" data-str="${i}">
          <span class="src-q ${x.height >= 720 ? "hd" : ""}">${esc(x.quality)}</span>
          <span class="src-body"><b>${esc(nice(x.label))}</b><span class="src-meta">${meta.map((m) => `<span>${esc(m)}</span>`).join("")}</span>
            ${x.health === "dead" ? `<span class="src-warn">${ic("info")} Not answering right now${x.why ? `, it ${esc(x.why)}` : ""}</span>` : ""}
            ${x.slow ? `<span class="src-warn">${ic("info")} Slow to start: ${esc(x.slow)}</span>` : ""}
            ${x.suspect && x.suspect.length ? `<span class="src-warn">${ic("info")} Probably not the real thing: ${esc(x.suspect.join(", "))}</span>` : ""}
            ${!x.plays ? `<span class="src-warn">${ic("info")} Might not play in this browser, saving it to the Library always works</span>` : ""}
            ${p > 0.02 ? `<span class="src-prog"><i style="width:${p * 100}%"></i></span>` : ""}</span>
          <span class="src-play">${ic("play")}</span></button>`;
      }).join("") : `<p class="secondary sr-empty">${esc(err || "No addon has a source for this.")}</p>`) : `<p class="secondary sr-empty">${loading ? "Looking for sources" : ""}</p>`);
      $$("[data-own]", list).forEach((b) => (b.onclick = () => { const f = own.find((x) => x.id === b.dataset.own); sh.close(); playFile(f.id, { title: t, from: f.progress && !f.watched ? f.progress.pos : 0 }); }));
      $$("[data-str]", list).forEach((b) => (b.onclick = () => {
        const x = streams[Number(b.dataset.str)];
        sh.close();
        SOURCES = { list: liveSources(streams), tried: new Set(), skips: 0, busyHosts: new Set(), busy: false };
        playFile(x.id, { from: x.progress && !x.progress.watched ? x.progress.pos : 0 });
      }));
      if (TV) { const f = $("[data-own], [data-str]", list); if (f && !list.contains(document.activeElement)) f.focus({ preventScroll: true }); }
    };
    draw(true);
    const url = `/api/streams/${t.kind}/${encodeURIComponent(vid)}`;
    try {
      let r = await api(url + "?quick=1");
      streams = r.streams; tooNew = r.too_new || null; if (r.upcoming) err = `Not out yet, comes out on ${new Date(r.upcoming + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`;
      draw(!!r.partial);
      if (r.partial) { r = await api(url); if (!sh.el.isConnected) return; streams = r.streams; tooNew = r.too_new || null; draw(false); }
    } catch (e) { err = e.message; streams = []; draw(false); }
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
          <span class="fm-post">${m.poster ? `<img src="${img(m.poster, 0, 342)}" alt="" data-fallback="hide">` : ""}</span>
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

  // ---------------------------------------------------------- interests
  // Things this profile is into. Recommendations lean towards them but still mix in other well rated titles, and
  // Kino adds ones it notices from what's been watched lately (marked Picked Up)
  async function drawInterests() {
    const box = $("#intCard");
    if (!box) return;
    let r;
    try { r = await api("/api/interests"); } catch (e) { box.innerHTML = `<h2 class="set-title">Your Interests</h2><div class="err-note">${esc(e.message)}</div>`; return; }
    const kindName = { genre: "Genre", person: "Person", word: "Topic" };
    box.innerHTML = `<h2 class="set-title">Your Interests</h2>
      <p class="secondary set-hint">Tell Kino what you're into, like a genre, an actor or director, or a topic like Heists or Space. Recommendations lean towards these but still show other things you might like. Kino adds some itself from what you've been watching.</p>
      <div class="int-list">${r.interests.length ? r.interests.map((i) => `<button class="int-chip ${i.auto ? "auto" : ""}" data-int="${esc(i.name)}" aria-label="Remove ${esc(i.name)}" title="Remove">
          <span>${esc(i.name)}</span><span class="int-kind">${i.auto ? "Picked Up" : kindName[i.kind] || ""}</span>${ic("close")}</button>`).join("")
        : `<span class="secondary">No interests yet. Add some below, or watch a few things and Kino will pick some up.</span>`}</div>
      <form class="int-add" id="intForm"><input id="intIn" placeholder="Add an interest" maxlength="40" autocomplete="off" enterkeyhint="done"><button class="btn primary small" type="submit">${ic("plus")} Add</button></form>
      <div class="form-err" id="intErr" role="alert"></div>
      ${r.suggestions.length ? `<div class="menu-label" style="padding-left:0">Ideas</div><div class="int-list">${r.suggestions.map((x) => `<button class="int-chip sugg" data-add="${esc(x.name)}" data-kind="${x.kind}">${ic("plus")}<span>${esc(x.name)}</span></button>`).join("")}</div>` : ""}
      <div class="set-row" style="margin-top:10px"><span><b>Start Over</b><span class="secondary">Forgets your interests and what you've watched so far for recommendations. Your history and ratings stay.</span></span>
        <button class="btn secondary small" id="intReset">Reset Recommendations</button></div>`;
    const add = async (name, kind) => {
      try { await api("/api/interests", { name, kind }); toast(`Added ${name}`); drawInterests(); }
      catch (e) { $("#intErr").textContent = e.message; }
    };
    $("#intForm").onsubmit = (e) => { e.preventDefault(); const v = $("#intIn").value.trim(); if (v) add(v); };
    $$("[data-add]", box).forEach((b) => (b.onclick = () => add(b.dataset.add, b.dataset.kind)));
    $$("[data-int]", box).forEach((b) => (b.onclick = async () => {
      await api("/api/interests?name=" + encodeURIComponent(b.dataset.int), undefined, "DELETE").catch(() => {});
      toast(`Removed ${b.dataset.int}`);
      drawInterests();
    }));
    $("#intReset").onclick = async () => {
      if (!(await confirmSheet("Reset your recommendations?", "Your interests are cleared and what you've watched and rated so far stops counting towards Top Picks. Your history and ratings are kept.", "Reset", true))) return;
      await api("/api/interests/reset", {});
      toast("Recommendations reset");
      drawInterests();
    };
  }

  // ---------------------------------------------------------- history
  // Everything this profile has watched, newest first and grouped by day. Removing something takes away its
  // progress too, like it was never started
  async function pageHistory() {
    const n = ROUTE_N;
    let items = [], next = null;
    const r = await api("/api/history");
    if (n !== ROUTE_N) return;
    items = r.items; next = r.next;
    const dayOf = (ts) => {
      const d = new Date(ts * 1000), now = new Date();
      const diff = Math.round((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
      if (diff === 0) return "Today";
      if (diff === 1) return "Yesterday";
      if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
      return d.toLocaleDateString([], { day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
    };
    const entry = (h) => {
      const pct = h.watched ? 1 : h.dur ? Math.min(1, h.pos / h.dur) : 0;
      const pic = h.thumbnail || h.background || h.poster;
      const what = [h.season != null ? epLabel(h.season, h.episode) : h.kind === "series" ? "TV Show" : h.kind === "movie" ? "Movie" : "Video", h.ep_name ? nice(h.ep_name) : ""].filter(Boolean).join(" · ");
      const state = h.watched ? "Watched" : h.dur ? `${clock(Math.max(0, h.dur - h.pos))} left` : "Started";
      return `<div class="hist" data-fid="${esc(h.file_id)}">
        <a class="hist-art" href="${esc(h.href)}" tabindex="-1" aria-hidden="true">${pic ? `<img loading="lazy" decoding="async" src="${img(pic, 0, 480)}" alt="" data-fallback="ph">` : `<div class="ph" style="--h:${hue(h.name)}">${esc(h.name)}</div>`}
          ${pct ? `<div class="bar"><i style="width:${pct * 100}%"></i></div>` : ""}</a>
        <div class="hist-body"><a class="hist-name" href="${esc(h.href)}">${esc(h.name)}</a><div class="secondary">${esc(what)}</div>
          <div class="tertiary">${esc(state)} · ${new Date(h.updated * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</div></div>
        <div class="hist-act">
          <button class="round-btn sm" data-hplay="${esc(h.file_id)}" data-tid="${esc(h.title_id || "")}" data-pos="${h.watched ? 0 : h.pos}" aria-label="Play ${esc(h.name)}" title="${h.watched ? "Play Again" : "Resume"}">${ic("play")}</button>
          <button class="round-btn sm" data-hdel="${esc(h.file_id)}" aria-label="Remove ${esc(h.name)} from History" title="Remove from History">${ic("trash")}</button>
        </div></div>`;
    };
    const draw = () => {
      let last = "", html = "";
      for (const h of items) {
        const d = dayOf(h.updated);
        if (d !== last) { html += `${last ? "</div>" : ""}<h2 class="section-title hist-day">${esc(d)}</h2><div class="hist-list">`; last = d; }
        html += entry(h);
      }
      if (last) html += "</div>";
      return html;
    };
    app.innerHTML = topbar("history") + `<main class="page narrow history">
      <h1 class="large-title">History</h1>
      <p class="secondary set-hint">Everything ${esc(ME.profile.name)} has watched. Removing something also clears its progress.</p>
      <div id="histBody">${items.length ? draw() : `<div class="empty"><h2>Nothing watched yet</h2><p>Films and episodes show up here once you start them.</p></div>`}</div>
      ${next ? `<div class="actions" style="justify-content:center;margin-top:24px"><button class="btn secondary small" id="histMore">Show Older</button></div>` : ""}
      ${items.length ? `<div class="actions end" style="margin-top:28px"><button class="btn danger small" id="histClear">${ic("trash")} Clear History</button></div>` : ""}
    </main>`;
    wireTopbar();
    const body = $("#histBody");
    body.addEventListener("click", async (e) => {
      const del = e.target.closest("[data-hdel]");
      if (del) {
        await api("/api/history?file_id=" + encodeURIComponent(del.dataset.hdel), undefined, "DELETE").catch((x) => toast(x.message));
        const row = del.closest(".hist"), list = row.parentElement;
        const nextFocus = row.nextElementSibling || row.previousElementSibling;
        row.remove();
        items = items.filter((x) => x.file_id !== del.dataset.hdel);
        if (!list.children.length) { list.previousElementSibling.remove(); list.remove(); }
        if (nextFocus) $("[data-hdel]", nextFocus).focus();
        toast("Removed from History");
        return;
      }
      const pb = e.target.closest("[data-hplay]");
      if (pb) {
        const fid = pb.dataset.hplay, from = Number(pb.dataset.pos) || 0;
        if (fid.startsWith("s") || !pb.dataset.tid) return playFile(fid, { from });
        const t = await api(`/api/title/${pb.dataset.tid}`).catch(() => null);
        playFile(fid, { title: t, from });
      }
    });
    const more = $("#histMore");
    if (more) more.onclick = async () => {
      const r2 = await api("/api/history?before=" + next);
      items = items.concat(r2.items); next = r2.next;
      body.innerHTML = draw();
      if (!next) more.remove();
    };
    const clr = $("#histClear");
    if (clr) clr.onclick = async () => {
      if (!(await confirmSheet("Clear all of your history?", `Everything ${ME.profile.name} has watched is forgotten, including where you got to and what's marked as watched. This can't be undone.`, "Clear History"))) return;
      await api("/api/history", undefined, "DELETE");
      toast("History cleared");
      route();
    };
  }


  // ---------------------------------------------------------- live tv
  // Channels from the IPTV playlists the admin added (english first, the UK then the US), and live rows from addons.
  // Channels plays straight away, and in the player up and down (or the channel buttons) flick through the ones
  // around it. The Guide shows whats on over the next few hours for channels that have guide data
  const LIVE_STATE = { group: "", country: "", q: "", fav: false };
  const hm = (t) => new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const flag = (c) => ({ uk: "UK", us: "US", fr: "France", de: "Germany", ie: "Ireland", ca: "Canada", au: "Australia", nz: "New Zealand" })[c] || (c ? c.toUpperCase() : "");
  let LIVE_LIST = [];
  // With a filter or search on the count says how many are showing, the whole library number only means something unfiltered
  const liveCount = (m) => { const f = LIVE_STATE.fav || LIVE_STATE.group || LIVE_STATE.country || LIVE_STATE.q; return f ? `${m.channels.length}${m.next ? "+" : ""} working` : `${m.total} working`; };
  const chanCard = (c, i) => {
    const pr = c.now ? Math.min(1, Math.max(0, (Date.now() / 1000 - c.now.start) / (c.now.stop - c.now.start))) : null;
    return `<div class="ch-cell"><button class="ch-card" data-ch="${i}" data-cid="${esc(c.id)}" aria-label="${esc(c.name)}${c.now ? ", " + esc(c.now.title) : ""}">
      <span class="ch-logo">${c.logo ? `<img loading="lazy" decoding="async" src="${img(c.logo, 1, 240)}" alt="" data-fallback="initials" data-ini="${esc(c.name.slice(0, 2))}">` : `<b class="ch-ph">${esc(c.name.slice(0, 2))}</b>`}</span>
      <span class="ch-body"><b class="ch-name">${esc(c.name)}</b>
        <span class="ch-now">${c.now ? esc(c.now.title) : esc([c.group, flag(c.country)].filter(Boolean).join(" · "))}</span>
        ${pr != null ? `<span class="ch-bar"><i style="width:${pr * 100}%"></i></span>` : ""}
        ${c.next ? `<span class="ch-next">${hm(c.next.start)} ${esc(c.next.title)}</span>` : ""}</span></button>
      <button class="ch-opt" data-opt="${i}" aria-label="More for ${esc(c.name)}" title="Favourite, Record">${ic("more")}</button></div>`;
  };

  async function pageLive(mode) {
    const n = ROUTE_N;
    const st = LIVE_STATE, guide = mode === "guide";
    const qs = () => [st.fav && "fav=1", st.group && "group=" + encodeURIComponent(st.group), st.country && "country=" + encodeURIComponent(st.country), st.q && "q=" + encodeURIComponent(st.q)].filter(Boolean).join("&");
    const r = await api("/api/live?" + qs());
    if (n !== ROUTE_N) return;
    const tabs = `<div class="live-tabs" role="tablist"><a class="${!mode ? "on" : ""}" href="#/live" role="tab">${ic("live")} Channels</a><a class="${guide ? "on" : ""}" href="#/live/guide" role="tab">${ic("guide")} TV Guide</a>${!kidsMode() ? `<a class="${mode === "rec" ? "on" : ""}" href="#/live/rec" role="tab">${ic("download")} Recordings</a>` : ""}</div>`;
    if (mode === "rec") {
      app.innerHTML = topbar("live") + `<main class="page live-page"><div class="live-head"><h1 class="large-title">Live TV</h1>${tabs}</div><div id="recList"></div></main>`;
      wireTopbar();
      return drawRecordings();
    }
    app.innerHTML = topbar("live") + `<main class="page live-page">
      <div class="live-head"><h1 class="large-title">Live TV</h1>${tabs}</div>
      ${!r.total && !r.addon_rows.length && !r.embeds.length && !st.fav && !st.q ? `<div class="empty"><h2>No channels yet</h2><p>${isAdmin() ? "Add an IPTV playlist (M3U) in Settings under Live TV, or install an addon with live channels." : "Ask the admin to add some channels."}</p>${isAdmin() ? `<a class="btn secondary small" href="#/settings">Open Settings</a>` : ""}</div>` : `
      <div class="live-filters">
        ${r.countries.length > 1 ? `<label class="live-sel"><span class="sr">Country</span><select class="plain" id="lvCountry" aria-label="Country"><option value="">All Countries</option>${r.countries.map((x) => `<option value="${esc(x)}" ${st.country === x ? "selected" : ""}>${esc(flag(x))}</option>`).join("")}</select></label>` : ""}
        ${r.groups.length > 1 || r.fav_count ? `<label class="live-sel"><span class="sr">Category</span><select class="plain" id="lvGroup" aria-label="Category"><option value="">All Categories</option>${r.fav_count ? `<option value="__fav" ${st.fav ? "selected" : ""}>★ Favourites</option>` : ""}${r.groups.map((x) => `<option value="${esc(x)}" ${st.group === x && !st.fav ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>` : ""}
      </div>
      ${guide ? `<div id="guide" class="guide"></div>` : `
      <form class="search live-search" id="lsForm" role="search">${ic("search")}<input id="lsq" type="search" placeholder="Find a channel" value="${esc(st.q)}" autocomplete="off"></form>
      <div id="favRow"></div>
      <div id="liveRows"></div>
      <section class="section"><h2 class="section-title">${st.fav ? "Favourites" : st.group || st.country ? esc([flag(st.country), st.group].filter(Boolean).join(" ")) : "Channels"} <span class="from" id="chCount">${r.total ? liveCount(r) : ""}</span></h2>
        <div class="ch-grid" id="chGrid">${r.channels.map(chanCard).join("")}</div>
        <div class="grid-more" id="chMore" ${r.next ? "" : "hidden"}><span class="spin small"></span></div></section>`}`}
    </main>`;
    wireTopbar();
    LIVE_LIST = r.channels.slice();
    const lc = $("#lvCountry"), lg = $("#lvGroup");
    if (lc) lc.onchange = () => { st.country = lc.value; route(); };
    if (lg) lg.onchange = () => { st.fav = lg.value === "__fav"; st.group = st.fav ? "" : lg.value; route(); };
    if (guide) return drawGuide(qs(), n);
    const grid = $("#chGrid");
    if (!grid) return;
    grid.addEventListener("click", (e) => {
      const o = e.target.closest("[data-opt]");
      if (o) return liveOptions(LIVE_LIST[Number(o.dataset.opt)], null, o);
      const b = e.target.closest("[data-ch]"); if (b) playLive(LIVE_LIST[Number(b.dataset.ch)], LIVE_LIST);
    });
    let next = r.next, busy = false, t, qn = 0;
    // Searching only redraws the channels, so the box keeps focus while you type
    const find = async () => {
      const my = ++qn;
      const m = await api("/api/live?" + qs()).catch(() => null);
      if (!m || my !== qn || n !== ROUTE_N || !$("#chGrid")) return;
      LIVE_LIST = m.channels.slice();
      grid.innerHTML = m.channels.map(chanCard).join("") || `<p class="secondary">No channels called that.</p>`;
      next = m.next;
      $("#chMore").hidden = !next;
      $("#chCount").textContent = m.total ? liveCount(m) : "";
      $("#liveRows").hidden = !!st.q;
    };
    $("#lsq").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { st.q = e.target.value.trim(); find(); }, 300); });
    $("#lsForm").onsubmit = (e) => { e.preventDefault(); clearTimeout(t); st.q = $("#lsq").value.trim(); find(); };
    // More channels as you scroll down
    const more = async () => {
      // The page is gone (or redrawn) so this listener has nothing left to do, and must not touch the shared list
      if (!grid.isConnected || n !== ROUTE_N) { removeEventListener("scroll", more); return; }
      if (!next || busy || !$("#chMore") || $("#chMore").getBoundingClientRect().top > innerHeight * 1.6) return;
      busy = true;
      try {
        const m = await api(`/api/live?${qs()}&skip=${next}`);
        if (!grid.isConnected || n !== ROUTE_N) { busy = false; return; }
        const from = LIVE_LIST.length;
        LIVE_LIST.push(...m.channels);
        grid.insertAdjacentHTML("beforeend", m.channels.map((c, i) => chanCard(c, from + i)).join(""));
        next = m.next;
        if (!next) $("#chMore").hidden = true;
      } catch (_) {}
      busy = false;
    };
    window.addEventListener("scroll", more, { passive: true });
    grid.addEventListener("focusin", more);
    if (r.fav_count && !st.fav && !st.group && !st.country && !st.q) drawFavRow();
    // Live rows from addons (events, channels), each filled in when it arrives
    const rows = $("#liveRows");
    // Embed sources (a service's own player pages), a row each, live ones first
    if (!st.group && !st.country && !st.q && !st.fav) r.embeds.forEach(async (src) => {
      const sec = document.createElement("section");
      sec.className = "shelf";
      sec.setAttribute("aria-label", src.name);
      sec.innerHTML = `<h2 class="section-title">${esc(src.name)}</h2><div class="row wide">${Array.from({ length: 5 }, () => `<div class="sk sk-wide"></div>`).join("")}</div>`;
      rows.prepend(sec);
      try {
        const x = await api(`/api/live/embed/${src.id}`);
        if (!x.items.length) { sec.remove(); return; }
        $(".row", sec).innerHTML = x.items.map((it, i) => `<a class="tile landscape emb-tile" href="#/live" data-emb="${i}"><div class="art">${it.image ? `<img loading="lazy" decoding="async" src="${img(it.image, 0, WW())}" alt="" data-fallback="ph">` : `<div class="ph" style="--h:${hue(it.title)}">${esc(it.title)}</div>`}${it.live ? `<span class="tile-live">Live${it.score ? " " + esc(it.score) : ""}</span>` : ""}</div>
          <div class="cap">${esc(it.title)}</div><div class="sub">${esc([it.category, !it.live && it.when].filter(Boolean).join(" · "))}</div></a>`).join("");
        $(".row", sec).addEventListener("click", (e) => { const a = e.target.closest("[data-emb]"); if (!a) return; e.preventDefault(); openEmbed(x.items, Number(a.dataset.emb), src.name); });
      } catch (_) { sec.remove(); }
    });
    if (!st.group && !st.country && !st.q && !st.fav) r.addon_rows.forEach(async (row) => {
      const sec = document.createElement("section");
      sec.className = "shelf";
      sec.setAttribute("aria-label", row.title);
      sec.innerHTML = `<h2 class="section-title">${esc(row.title)} <span class="from">${esc(row.source || "")}</span></h2><div class="row wide">${Array.from({ length: 5 }, () => `<div class="sk sk-wide"></div>`).join("")}</div>`;
      rows.appendChild(sec);
      try {
        const x = await api(`/api/live/addon?id=${encodeURIComponent(row.id)}`);
        if (!x.items.length) { sec.remove(); return; }
        $(".row", sec).innerHTML = x.items.map((it) => liveTile(it)).join("");
      } catch (_) { sec.remove(); }
    });
  }

  // An addon's live item (a channel or an event) as a wide card that plays straight away
  const liveTile = (t) => `<a class="tile landscape" href="#/live" data-live="${esc(t.live_id)}" data-name="${esc(t.name)}"><div class="art">${t.background || t.poster ? `<img loading="lazy" decoding="async" src="${img(t.background || t.poster, 0, WW())}" alt="${esc(t.name)}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(t.name)}">${esc(t.name)}</div>`}<span class="tile-live">Live</span></div>
      <div class="cap">${esc(t.name)}</div><div class="sub">${esc((t.genres || []).slice(0, 2).join(", ") || "Live")}</div></a>`;
  document.addEventListener("click", (e) => {
    const em = e.target.closest("[data-embs]");
    if (em) { e.preventDefault(); const x = SEARCH_EMBEDS[Number(em.dataset.embs)]; if (x) openEmbed([x], 0, x.source); return; }
    const a = e.target.closest("[data-live]");
    if (!a) return;
    e.preventDefault();
    playLive({ id: a.dataset.live, name: a.dataset.name || "Live" }, null);
  });

  async function drawGuide(qs, n) {
    const box = $("#guide");
    const start = Math.floor(Date.now() / 1000 / 1800) * 1800, hours = TV ? 2 : 3, span = hours * 3600;
    const url = (skip) => `/api/live/guide?start=${start}&hours=${hours}&${qs}${skip ? "&skip=" + skip : ""}`;
    const r = await api(url(0));
    if (!$("#guide") || n !== ROUTE_N) return;
    if (!r.channels.length) { box.innerHTML = `<div class="empty"><h2>No guide for these channels</h2><p>The playlist didn't come with a guide, the admin can add an XMLTV guide link in Settings.</p></div>`; return; }
    LIVE_LIST = r.channels.slice();
    const pct = (t) => Math.max(0, Math.min(100, ((t - start) / span) * 100));
    const slots = Array.from({ length: hours * 2 }, (_, i) => start + i * 1800);
    const rowHtml = (c, i) => `<div class="g-row"><button class="g-ch" data-ch="${i}" data-cid="${esc(c.id)}" aria-label="${esc(c.name)}">${c.logo ? `<img loading="lazy" decoding="async" src="${img(c.logo, 1, 160)}" alt="" data-fallback="hide">` : ""}<span>${esc(c.name)}</span></button>
        <div class="g-line">${c.progs.map((p) => { const l = pct(p.start), w = pct(p.stop) - l; const on = p.start <= Date.now() / 1000 && p.stop > Date.now() / 1000;
          return w > 0.5 ? `<button class="g-prog ${on ? "on" : ""}" data-gp="${i}:${c.progs.indexOf(p)}" style="left:${l}%;width:${w}%" title="${esc(p.title)} ${hm(p.start)} to ${hm(p.stop)}"><b>${esc(p.title)}</b><span>${hm(p.start)}${p.sub ? " · " + esc(p.sub) : ""}</span></button>` : ""; }).join("") || `<span class="g-none">No guide</span>`}</div></div>`;
    box.innerHTML = `<div class="g-times"><span></span><div>${slots.map((t) => `<span style="left:${pct(t)}%">${hm(t)}</span>`).join("")}</div></div>
      ${r.channels.map(rowHtml).join("")}
      <div class="g-now" style="left:calc(var(--g-ch) + (100% - var(--g-ch)) * ${pct(Date.now() / 1000) / 100})"></div>`;
    box.addEventListener("click", (e) => {
      const g = e.target.closest("[data-gp]");
      if (g) { const [ci, pi] = g.dataset.gp.split(":").map(Number); return liveOptions(LIVE_LIST[ci], LIVE_LIST[ci].progs[pi], g); }
      const b = e.target.closest("[data-ch]"); if (b) playLive(LIVE_LIST[Number(b.dataset.ch)], LIVE_LIST);
    });
    // The server sends the guide 60 channels at a time, the rest come in as you scroll down like the Channels page
    let next = r.next, busy = false;
    if (!next) return;
    const sent = document.createElement("div");
    sent.className = "grid-more"; sent.id = "gMore";
    sent.innerHTML = `<span class="spin small"></span>`;
    box.insertAdjacentElement("afterend", sent);
    const more = async () => {
      if (!box.isConnected || n !== ROUTE_N) { removeEventListener("scroll", more); return; }
      if (!next || busy || sent.getBoundingClientRect().top > innerHeight * 1.6) return;
      busy = true;
      let ok = false;
      try {
        const m = await api(url(next));
        if (!box.isConnected || n !== ROUTE_N) { busy = false; return; }
        const from = LIVE_LIST.length;
        LIVE_LIST.push(...m.channels);
        $(".g-now", box).insertAdjacentHTML("beforebegin", m.channels.map((c, i) => rowHtml(c, from + i)).join(""));
        next = m.next;
        if (!next) sent.hidden = true;
        ok = true;
      } catch (_) {}
      busy = false;
      // A tall screen may still have the bottom in view after a batch
      if (ok && next) more();
    };
    addEventListener("scroll", more, { passive: true });
    box.addEventListener("focusin", more);
    more();
  }

  // Favourites at the top as little players: a fresh picture of whats on every minute, and on a computer the live
  // picture itself (muted) while the mouse is over one. Tvs keep to pictures, a video per card is too much for them
  // The little live picture and the picture refresh both belong to the row that is on screen, a new draw or a new page ends them
  function stopFavRow() {
    clearInterval(FAV_T); FAV_T = null;
    if (FAV_PV) { FAV_PV.h.destroy(); FAV_PV.v.remove(); FAV_PV = null; }
  }
  async function drawFavRow() {
    const box = $("#favRow");
    stopFavRow();
    const n = ROUTE_N;
    const m = await api("/api/live?fav=1").catch(() => null);
    if (!m || n !== ROUTE_N || !$("#favRow") || $("#favRow") !== box) return;
    if (!m.channels.length) { box.innerHTML = ""; return; }
    const favs = m.channels;
    const shot = (c) => `/api/live/${c.id}/thumb.jpg?m=${Math.floor(Date.now() / 60000)}`;
    // The star and the ··· sit on top of the picture as their own buttons (a button can't hold buttons)
    box.innerHTML = `<section class="shelf" aria-label="Favourites"><h2 class="section-title">★ Favourites</h2><div class="row wide fav-row">${favs.map((c, i) => {
      const pr = c.now ? Math.min(1, Math.max(0, (Date.now() / 1000 - c.now.start) / (c.now.stop - c.now.start))) : null;
      return `<div class="fav-cell"><button class="tile landscape fav-tile" data-fv="${i}" data-cid="${esc(c.id)}" aria-label="${esc(c.name)}${c.now ? ", " + esc(c.now.title) : ""}"><div class="art">
          <img class="fav-shot" src="${shot(c)}" alt="" data-fallback="hide">${c.logo ? `<img class="fav-logo" src="${img(c.logo, 1, 160)}" alt="" data-fallback="hide">` : ""}
          <span class="tile-live">Live</span>${pr != null ? `<div class="bar"><i style="width:${pr * 100}%"></i></div>` : ""}</div>
        <div class="cap">${esc(c.name)}</div><div class="sub">${esc(c.now ? c.now.title : c.group || "")}</div></button>
        <div class="fav-btns"><button class="fav-btn fav-star" data-fstar="${i}" aria-label="Remove ${esc(c.name)} from Favourites" title="Remove from Favourites">★</button><button class="fav-btn fav-dots" data-fopt="${i}" aria-label="More for ${esc(c.name)}" title="Record, Favourite">${ic("more")}</button></div></div>`;
    }).join("")}</div></section>`;
    const row = $(".fav-row", box);
    row.addEventListener("click", (e) => {
      const st = e.target.closest("[data-fstar]"); if (st) return setFav(favs[Number(st.dataset.fstar)], false);
      const o = e.target.closest("[data-fopt]"); if (o) return liveOptions(favs[Number(o.dataset.fopt)], null, o);
      const b = e.target.closest("[data-fv]"); if (b) playLive(favs[Number(b.dataset.fv)], favs);
    });
    FAV_T = setInterval(() => {
      if (!$("#favRow") || $("#favRow") !== box) return stopFavRow();
      $$(".fav-shot", box).forEach((im, i) => favs[i] && (im.src = shot(favs[i])));
    }, 60000);
    if (TV) return;
    row.addEventListener("mouseover", async (e) => {
      const b = e.target.closest("[data-fv]");
      if (!b || (FAV_PV && FAV_PV.b === b)) return;
      if (FAV_PV) { FAV_PV.h.destroy(); FAV_PV.v.remove(); FAV_PV = null; }
      try { await loadHls(); } catch (_) { return; }
      // The mouse may have moved on, or the row been redrawn, while hls.js was arriving
      if (!Hls.isSupported() || !b.isConnected || !b.matches(":hover") || FAV_PV) return;
      const v = document.createElement("video");
      v.className = "fav-video"; v.muted = true; v.playsInline = true;
      $(".art", b).appendChild(v);
      const h = new Hls({ liveSyncDurationCount: 2, maxBufferLength: 8, backBufferLength: 0, capLevelToPlayerSize: true });
      h.loadSource(`/api/live/${favs[Number(b.dataset.fv)].id}/index.m3u8`); h.attachMedia(v);
      h.on(Hls.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
      FAV_PV = { b, v, h };
    });
    row.addEventListener("mouseleave", () => { if (FAV_PV) { FAV_PV.h.destroy(); FAV_PV.v.remove(); FAV_PV = null; } });
  }

  // Adds or removes a favourite and updates what's on screen without redrawing the whole page
  async function setFav(ch, on) {
    try { await api(`/api/live/fav/${ch.id}`, on ? {} : undefined, on ? "POST" : "DELETE"); }
    catch (e) { return toast(e.message, 4000); }
    ch.fav = on;
    LIVE_LIST.forEach((c) => { if (c.id === ch.id) c.fav = on; });
    toast(on ? "Added to Favourites" : "Removed from Favourites");
    if (!location.hash.startsWith("#/live") || location.hash.includes("guide")) return;
    if (LIVE_STATE.fav && !on) return route();
    const hadFocus = document.activeElement && document.activeElement.closest && document.activeElement.closest("#favRow");
    await drawFavRow();
    if (hadFocus) { const f = $("#favRow .fav-tile") || $("#chGrid .ch-card"); if (f) f.focus(); }
  }

  // A small menu that opens right next to the button it came from (not a full screen sheet), moves up or left when it would
  // run off the screen, and closes on a tap outside, Back or Escape. Focus goes to the first item for the remote
  let POP = null;
  function closePop(refocus = true) {
    if (!POP) return false;
    const { el, anchor, off } = POP;
    POP = null;
    el.remove(); off();
    if (refocus && anchor && anchor.isConnected && anchor.focus) anchor.focus({ preventScroll: true });
    return true;
  }
  function popMenu(anchor, html) {
    closePop(false);
    const el = document.createElement("div");
    el.className = "menu drop pop"; el.setAttribute("role", "menu"); el.innerHTML = html;
    document.body.appendChild(el);
    const place = () => {
      const r = anchor.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, m = TV ? 27 : 8;  // a tv crops the edges
      el.style.maxWidth = Math.min(320, vw - 2 * m) + "px";
      const w = el.offsetWidth, h = el.offsetHeight;
      let left = r.right - w;                       // lines up with the button's right edge
      if (r.width > 160) left = r.left;             // a wide thing (a programme), lines up with its left edge
      left = Math.max(m, Math.min(left, vw - w - m));
      const below = vh - r.bottom - m, above = r.top - m;
      let top = h <= below || below >= above ? r.bottom + 6 : r.top - h - 6;
      top = Math.max(m, Math.min(top, vh - Math.min(h, vh - 2 * m) - m));
      el.style.left = left + "px"; el.style.top = top + "px";
      el.style.maxHeight = vh - 2 * m + "px";
    };
    place();
    const away = (e) => { if (!el.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) closePop(false); };
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); closePop(); } };
    // Scrolling or resizing moves the menu with its button (it only closes if the button scrolled out of sight)
    const gone = (e) => {
      if (e && e.target && el.contains(e.target)) return;
      const r = anchor.getBoundingClientRect();
      if (!anchor.isConnected || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return closePop(false);
      place();
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key, true);
    addEventListener("resize", gone);
    addEventListener("scroll", gone, true);
    POP = { el, anchor, off: () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", key, true); removeEventListener("resize", gone); removeEventListener("scroll", gone, true); } };
    anchor.setAttribute("aria-haspopup", "true");
    setTimeout(() => { const f = $(".mi", el); if (f) f.focus({ preventScroll: true }); }, 30);
    return el;
  }

  // A channel's options (or a programme's, from the guide): watch, favourite, record
  function liveOptions(ch, prog, anchor) {
    if (!ch) return;
    // Pressing the button of a menu thats already open closes it. The outside press check skips the button its self, so without
    // this the click just opened the same menu again and it looked like nothing happened
    if (anchor && POP && POP.anchor === anchor) return void closePop();
    const now = Date.now() / 1000, on = prog && prog.start <= now && prog.stop > now, later = prog && prog.start > now;
    const isChan = String(ch.id).startsWith("c");
    const cur = !prog && ch.now ? ch.now : null;
    const head = `<div class="pop-head"><b>${esc(prog ? prog.title : ch.name)}</b><span class="secondary">${esc(prog ? `${ch.name} · ${hm(prog.start)} to ${hm(prog.stop)}` : cur ? `Now: ${cur.title}, until ${hm(cur.stop)}` : ch.group || "Live")}</span>
        ${prog && prog.desc ? `<span class="secondary pop-desc">${esc(prog.desc.slice(0, 140))}</span>` : ""}</div>`;
    const body = `${!later ? `<button class="mi" role="menuitem" data-o="watch">${ic("play")} Watch</button>` : ""}
        ${!kidsMode() ? (prog ? `<button class="mi" role="menuitem" data-o="recprog">${ic("download")} Record ${on ? "the Rest of This" : "This Programme"}</button>`
          : `${cur ? `<button class="mi" role="menuitem" data-o="reccur">${ic("download")} Record ${esc(cur.title.slice(0, 40))}</button>` : ""}<button class="mi" role="menuitem" data-o="rec60">${ic("download")} Record the Next Hour</button><button class="mi" role="menuitem" data-o="rec120">${ic("download")} Record the Next 2 Hours</button>`) : ""}
        ${isChan ? `<button class="mi" role="menuitem" data-o="fav">${ch.fav ? "★ Remove from Favourites" : "☆ Add to Favourites"}</button>` : ""}`;
    const el = anchor ? popMenu(anchor, head + body) : null;
    const root = el || sheet(`<div class="src-head"><div><h2>${esc(prog ? prog.title : ch.name)}</h2></div></div><div class="opt-list">${body}</div>`).el;
    const done = () => (el ? closePop(false) : closeSheet());
    const rec = async (b) => {
      try { const r = await api("/api/live/record", { cid: ch.id, channel: ch.name, ...b }); done(); toast(r.now ? "Recording to the Storage Box" : "Recording scheduled", 3500); }
      catch (e) { toast(e.message, 5000); }
    };
    $$("[data-o]", root).forEach((b) => (b.onclick = async () => {
      const o = b.dataset.o;
      if (o === "watch") { done(); playLive(ch, LIVE_LIST.includes(ch) ? LIVE_LIST : [ch]); }
      else if (o === "recprog") rec({ title: prog.title, start: prog.start, stop: prog.stop });
      else if (o === "reccur") rec({ title: cur.title, start: cur.start, stop: cur.stop });
      else if (o === "rec60") rec({ minutes: 60 });
      else if (o === "rec120") rec({ minutes: 120 });
      else if (o === "fav") { done(); setFav(ch, !ch.fav); }
    }));
  }

  // Recordings on the Storage Box: whats recording, whats coming up, and what's done
  async function drawRecordings() {
    const box = $("#recList");
    const r = await api("/api/live/recordings").catch(() => ({ recordings: [] }));
    if (!$("#recList") || $("#recList") !== box) return;
    const label = { recording: "Recording", scheduled: "Scheduled", done: "", stopped: "Stopped early", failed: "Failed" };
    box.innerHTML = r.recordings.length ? `<div class="list rec-list">${r.recordings.map((x) => `<div class="li rec">
        <span class="grow"><b>${esc(x.title)}</b>${label[x.state] ? ` <span class="badge ${x.state === "recording" ? "rec-on" : x.state === "failed" ? "warn" : ""}">${label[x.state]}</span>` : ""}<br>
          <span class="secondary">${esc(x.channel)} · ${esc(new Date(x.start * 1000).toLocaleDateString([], { day: "numeric", month: "short" }))} ${hm(x.start)} to ${hm(x.stop)}${x.size ? " · " + bytes(x.size) : ""}${x.error ? " · " + esc(x.error) : ""}</span></span>
        ${x.playable ? `<button class="round-btn sm" data-rplay="${x.id}" aria-label="Play ${esc(x.title)}">${ic("play")}</button>` : ""}
        ${x.state === "recording" || x.state === "scheduled" ? `<button class="btn secondary small" data-rstop="${x.id}">${x.state === "recording" ? "Stop" : "Cancel"}</button>` : ""}
        <button class="round-btn sm" data-rdel="${x.id}" aria-label="Delete ${esc(x.title)}">${ic("trash")}</button></div>`).join("")}</div>`
      : `<div class="empty"><h2>No recordings yet</h2><p>Open a channel's options (the ··· next to it) or pick a programme in the TV Guide to record it to the Storage Box.</p></div>`;
    $$("[data-rplay]", box).forEach((b) => (b.onclick = () => playRecording(r.recordings.find((x) => String(x.id) === b.dataset.rplay))));
    $$("[data-rstop]", box).forEach((b) => (b.onclick = async () => { await api(`/api/live/recordings/${b.dataset.rstop}/stop`, {}).catch((e) => toast(e.message)); drawRecordings(); }));
    $$("[data-rdel]", box).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet("Delete this recording?", "It's removed from the Storage Box.", "Delete"))) return;
      await api(`/api/live/recordings/${b.dataset.rdel}`, undefined, "DELETE").catch((e) => toast(e.message)); drawRecordings();
    }));
    if (r.recordings.some((x) => x.state === "recording" || x.state === "scheduled")) setTimeout(() => { if ($("#recList") === box) drawRecordings(); }, 15000);
  }

  function playRecording(x) {
    if (!x) return;
    const url = `/api/live/recordings/${x.id}/file`;
    if (useNative()) {
      window.KinoAndroid.playNative(JSON.stringify({ fid: "r" + x.id, url, title: x.title, sub: x.channel, base: location.origin, ua: navigator.userAgent, start: 0, duration: 0,
        art: { background: null, logo: null }, video: {}, subs: [], audioN: 0, isStream: false, moreSources: false, autoplay: false, loadStats: false, subSize: "m" }));
      NATIVE = { fid: "r" + x.id, info: { recording: true, prefs: {} }, opts: {}, live: { rec: true } };
      return;
    }
    closePlayer(true);
    clearInterval(HERO_T);
    pl.el.hidden = false;
    document.body.style.overflow = "hidden";
    liveChrome();
    pl.info = { recording: true, id: "r" + x.id, name: x.title, prefs: (ME.profile && ME.profile.prefs) || {}, subs: [], audio: [], stream: false, duration: 0 };
    $("#pTitle").textContent = x.title;
    $("#pSub").textContent = x.channel;
    pl.mode = "direct";
    spinner(true);
    pl.v.src = url;
    pl.v.play().catch(() => {});
    wakeUi();
  }

  // ---- embed player: the service's own player page in a locked down frame (no popups, cant navigate Kino away),
  // full screen with the title, previous and next on top. Back closes it
  let EMB = null;
  function openEmbed(items, i, source) {
    closeEmbed();
    const el = document.createElement("div");
    el.className = "embed-view";
    el.setAttribute("role", "dialog");
    el.innerHTML = `<div class="emb-bar"><button class="glass-btn round" id="embClose" aria-label="Close">${ic("close")}</button>
        <div class="emb-title"><b id="embTitle"></b><span class="secondary" id="embSub"></span></div>
        <button class="icon-btn" id="embPrev" aria-label="Previous">${ic("chevronL")}</button><button class="icon-btn" id="embNext" aria-label="Next">${ic("chevronR")}</button></div>
      <iframe id="embFrame" sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
    document.body.appendChild(el);
    document.body.style.overflow = "hidden";
    EMB = { el, items, i, source, t: null };
    const wake = () => { el.classList.remove("idle"); clearTimeout(EMB && EMB.t); if (EMB) EMB.t = setTimeout(() => el.classList.add("idle"), 3500); };
    el.addEventListener("mousemove", wake);
    el.addEventListener("keydown", wake);
    $("#embClose", el).onclick = closeEmbed;
    $("#embPrev", el).onclick = () => stepEmbed(-1);
    $("#embNext", el).onclick = () => stepEmbed(1);
    showEmbed();
    wake();
    $("#embClose", el).focus();
  }
  function showEmbed() {
    const it = EMB.items[EMB.i];
    $("#embTitle").textContent = it.title;
    $("#embSub").textContent = [EMB.source, it.live ? "Live" : it.when, it.category].filter(Boolean).join(" · ");
    $("#embFrame").src = it.player;
    $("#embPrev").hidden = $("#embNext").hidden = EMB.items.length < 2;
  }
  function stepEmbed(d) { if (!EMB) return; EMB.i = (EMB.i + d + EMB.items.length) % EMB.items.length; showEmbed(); }
  function closeEmbed() {
    if (!EMB) return false;
    clearTimeout(EMB.t);
    EMB.el.remove();
    EMB = null;
    document.body.style.overflow = "";
    return true;
  }
  document.addEventListener("keydown", (e) => {
    if (!EMB) return;
    if (e.key === "Escape") { e.preventDefault(); closeEmbed(); }
    else if (["PageUp", "ChannelUp"].includes(e.key)) stepEmbed(-1);
    else if (["PageDown", "ChannelDown"].includes(e.key)) stepEmbed(1);
  });

  // ---- playing a channel
  let LIVE_NOW = null;  // { list, i }
  // Where the remote was when a channel started (the Channels grid, the guide or a favourite). Closing the player puts it back
  // on that channel. The page behind can be gone by then (a tv let it go for memory) so its kept in sessionStorage too
  let LIVE_BACK = null;
  function liveBackRead() {
    if (LIVE_BACK) return LIVE_BACK;
    try { return JSON.parse(sessionStorage.getItem("kino.liveBack") || "null"); } catch (_) { return null; }
  }
  function liveBackClear() {
    LIVE_BACK = null;
    try { sessionStorage.removeItem("kino.liveBack"); } catch (_) {}
  }
  async function liveBackFocus(id) {
    const b = liveBackRead();
    // Only a tv remote needs this, and only when it started from one of the live pages (an addon tile or search has nothing to return to)
    if (!TV || !b || !b.kind || !location.hash.startsWith("#/live")) return;
    const want = id || b.id, n = ROUTE_N, first = document.activeElement;
    const sels = b.kind === "g" ? [".g-ch"] : b.kind === "f" ? [".fav-tile", ".ch-card", ".g-ch"] : [".ch-card", ".fav-tile", ".g-ch"];
    const find = () => { for (const s of sels) { const el = $(`${s}[data-cid="${CSS.escape(want)}"]`); if (el) return el; } return null; };
    let el = find();
    // The page gets drawn again from the start, and both the Channels grid and the Guide only have their first batch on it. Bringing
    // the loader at the bottom into view makes the next batch come in, until the channel is there
    for (let t = 0; !el && t < 40; t++) {
      const more = $("#gMore:not([hidden]), #chMore:not([hidden])");
      if (more) more.scrollIntoView({ block: "end" });
      await new Promise((r) => setTimeout(r, 300));
      if (n !== ROUTE_N) return;
      // Somewhere else on the page now (the remote was used while this was loading), so leave it be
      const a = document.activeElement;
      if (a && a !== document.body && a !== first && a !== AUTO_FOCUS && a.isConnected) return;
      el = find();
    }
    if (!el || n !== ROUTE_N) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center", inline: "nearest" });
    liveBackClear();
  }

  function playLive(ch, list, opts = {}) {
    const from = document.activeElement, fk = from && from.closest ? (from.closest(".g-ch") ? "g" : from.closest(".fav-tile") ? "f" : from.closest(".ch-card") ? "c" : "") : "";
    LIVE_BACK = { id: ch.id, kind: fk };
    try { sessionStorage.setItem("kino.liveBack", JSON.stringify(LIVE_BACK)); } catch (_) {}
    if (!ch) return;
    list = list && list.length ? list : [ch];
    const i = Math.max(0, list.findIndex((x) => x.id === ch.id));
    if (useNative() && !opts.web) {
      // The app's own player, with the channels around this one so up and down change channel without leaving it
      const lo = Math.max(0, i - 100), near = list.slice(lo, i + 100);
      window.KinoAndroid.playNative(JSON.stringify({
        live: true, fid: ch.id, url: `/api/live/${ch.id}/index.m3u8`, title: ch.name, sub: ch.now ? ch.now.title : "",
        channels: near.map((c) => ({ id: c.id, name: c.name, now: c.now ? c.now.title : "", logo: c.logo || "" })), index: i - lo,
        base: location.origin, ua: navigator.userAgent, start: 0, duration: 0, art: { background: null, logo: ch.logo || null }, video: {}, subs: [], audioN: 0,
        isStream: false, moreSources: false, autoplay: false, loadStats: false, subSize: (ME.profile && ME.profile.prefs && ME.profile.prefs.sub_size) || "m",
      }));
      NATIVE = { fid: ch.id, info: { live: true, prefs: {} }, opts: {}, live: { ch, list } };
      return;
    }
    closePlayer(true);
    clearInterval(HERO_T);
    pl.el.hidden = false;
    pl.el.classList.add("live");
    document.body.style.overflow = "hidden";
    LIVE_NOW = { list, i };
    $("#pBack").innerHTML = ic("chevronL"); $("#pBack").setAttribute("aria-label", "Previous channel"); $("#pBack").title = "Previous Channel";
    $("#pFwd").innerHTML = ic("chevronR"); $("#pFwd").setAttribute("aria-label", "Next channel"); $("#pFwd").title = "Next Channel";
    tune();
    wakeUi();
  }
  function tune() {
    const ch = LIVE_NOW.list[LIVE_NOW.i];
    liveChrome();
    pl.info = { live: true, id: ch.id, name: ch.name, prefs: (ME.profile && ME.profile.prefs) || {}, subs: [], audio: [], stream: false, duration: 0 };
    $("#pTitle").textContent = ch.name;
    $("#pSub").textContent = ch.now ? ch.now.title : "";  // the red chip says Live, with nothing on the guide the name stands alone next to the logo
    // The channels logo sits in front of its name, if it cant load the name is still there
    const pg = $("#pLogo");
    pg.hidden = true;
    if (ch.logo) { pg.onload = () => { pg.hidden = false; }; pg.onerror = () => { pg.hidden = true; }; pg.src = img(ch.logo, 1, 240); }
    $("#pMsg").hidden = true;
    spinner(true);
    const url = `/api/live/${ch.id}/index.m3u8`;
    pl.mode = "live"; pl.liveStale = false; pl.liveRetries = 0;
    if (isSafari && pl.v.canPlayType("application/vnd.apple.mpegurl")) { pl.v.src = url; pl.v.play().catch(() => {}); return; }
    // The first channel waits for hls.js to arrive, a newer tune in the meantime wins
    if (!window.Hls) {
      const tk = pl.tuneTk = (pl.tuneTk || 0) + 1;
      loadHls().then(() => { if (pl.tuneTk === tk && !pl.el.hidden && pl.info && pl.info.live) tune(); })
        .catch((e) => { if (pl.tuneTk === tk) { spinner(false); showMsg("Couldn't start the channel", e.message, `<button class="btn primary small" id="lvAgain">Try Again</button>`); $("#lvAgain").onclick = () => tune(); } });
      return;
    }
    // One hls.js for every channel, switching just loads a new playlist into it which is much quicker than starting over
    if (!pl.hls) {
      const h = new Hls({ liveSyncDurationCount: 4, maxBufferLength: 30, backBufferLength: 20, manifestLoadingMaxRetry: 3, levelLoadingMaxRetry: 4, fragLoadingMaxRetry: 4, manifestLoadingTimeOut: 20000, levelLoadingTimeOut: 20000, fragLoadingTimeOut: 30000, enableWorker: true });
      pl.hls = h;
      h.attachMedia(pl.v);
      h.on(Hls.Events.ERROR, (_, d) => {
        if (!d.fatal || !pl.info || !pl.info.live) return;
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR) { h.recoverMediaError(); return; }
        // Paused, or still playing from what's already loaded, isn't a dead channel. While paused the server stops being asked
        // for new pieces and the playlist goes stale, so it gets loaded fresh (at the live edge) when play is pressed
        const b = pl.v.buffered, t = pl.v.currentTime;
        let ahead = 0;
        for (let i = 0; i < b.length; i++) if (t >= b.start(i) - 0.3 && t <= b.end(i)) ahead = b.end(i) - t;
        if (pl.v.paused && pl.v.readyState > 0) { pl.liveStale = true; return; }
        // Most of these are blips so it quietly goes again a few times (the playlist at the live edge if theres nothing
        // left to play) before saying the channel is broken, the count starts over after a minute without any
        const now = Date.now();
        if (now - (pl.liveErrAt || 0) > 60000) pl.liveRetries = 0;
        pl.liveErrAt = now;
        if ((pl.liveRetries = (pl.liveRetries || 0) + 1) <= 4) {
            const ch = LIVE_NOW && LIVE_NOW.i;
            setTimeout(() => { if (pl.hls === h && pl.info && pl.info.live && LIVE_NOW && LIVE_NOW.i === ch) { if (ahead > 3) h.startLoad(); else h.loadSource(`/api/live/${pl.info.id}/index.m3u8`); } }, 1000 * pl.liveRetries);
            return;
        }
        spinner(false);
        const cid = pl.info.id;
        // The server checks the channel itself before it is switched off, and says what went wrong (provider refused, too many devices...)
        api(`/api/live/${cid}/bad`, {}).catch(() => {});
        const buttons = `${LIVE_NOW.list.length > 1 ? `<button class="btn primary small" id="lvNext">Next Channel</button>` : ""}<button class="btn secondary small" id="lvAgain">Try Again</button><button class="btn secondary small" id="lvClose">Close</button>`;
        const wire = () => {
          const n = $("#lvNext"); if (n) { n.onclick = () => switchLive(1); n.focus(); }
          $("#lvClose").onclick = () => closePlayer();
          $("#lvAgain").onclick = () => tune();
        };
        api(`/api/live/${cid}/why`).then((r) => r.why || "").catch(() => "").then((why) => {
          if (!pl.info || !pl.info.live || pl.info.id !== cid) return;
          showMsg("This channel isn't working", why || "It might be off air right now, or the link stopped working.", buttons);
          wire();
        });
      });
      h.on(Hls.Events.MANIFEST_PARSED, () => pl.v.play().catch(() => {}));
    }
    pl.hls.loadSource(url);
  }
  function switchLive(d) {
    if (!LIVE_NOW || LIVE_NOW.list.length < 2) return;
    LIVE_NOW.i = (LIVE_NOW.i + d + LIVE_NOW.list.length) % LIVE_NOW.list.length;
    tune();
    toast(LIVE_NOW.list[LIVE_NOW.i].name, 1800);
  }

  // ---------------------------------------------------------- settings
  const LANG_OPTS = ["English", "German", "French", "Spanish", "Italian", "Dutch", "Polish", "Portuguese", "Russian", "Japanese", "Korean", "Chinese", "Swedish", "Danish", "Norwegian", "Finnish", "Turkish", "Arabic", "Hindi"];

  async function pageSettings() {
    const n = ROUTE_N;
    const me = await api("/api/me");
    if (n !== ROUTE_N) return;
    ME.profile = me.profile; ME.admin = me.admin; ME.ip = me.ip;
    const p = ME.profile, pr = p.prefs;
    const sel = (id, opts, val) => `<select class="plain" id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    const toggle = (id, on, label, hint) => `<label class="set-row"><span><b>${label}</b>${hint ? `<span class="secondary">${hint}</span>` : ""}</span><input type="checkbox" class="switch" id="${id}" ${on ? "checked" : ""}></label>`;

    app.innerHTML = topbar("settings") + `<main class="page narrow settings">
      <h1 class="large-title">Settings</h1>
      <section class="card set-card">
        <h2 class="set-title">Profile</h2>
        <div class="set-profile">${pav(p, "lg")}<div class="grow"><div class="set-name">${esc(p.name)}</div><div class="secondary">${p.members ? `A joint profile for ${esc(p.members.map((m) => m.name).join(" and "))}. It sees both of their history and what they like, and what you watch here counts for both of them.` : "Everyone on this profile shares the watch history and these settings."}</div></div>
          <button class="btn secondary small" id="editMe">${ic("pencil")} Edit</button></div>
        ${p.members ? `<div class="set-row"><span><b>Joint Profile</b><span class="secondary">${p.locked ? `Opens with ${esc(p.members.map((m) => m.name).join("'s or "))}'s code` : "Locks when either of you sets a code on your own profile"}</span></span>
          <span class="actions"><button class="btn secondary small" id="splitMe">${ic("people")} Split</button></span></div>`
        : `<div class="set-row"><span><b>Profile Lock</b><span class="secondary">${p.locked ? "A 4 digit code is needed to open this profile" : "Ask for a 4 digit code when someone picks this profile"}</span></span>
          <span class="actions">${p.locked ? `<button class="btn secondary small" id="pinChange">Change Code</button><button class="btn secondary small" id="pinOff">Remove</button>` : `<button class="btn secondary small" id="pinSet">${ic("lock")} Set Code</button>`}</span></div>`}
      </section>
      <section class="card set-card" id="intCard"><h2 class="set-title">Your Interests</h2><div class="sk sk-line" style="width:60%"></div></section>
      <section class="card set-card">
        <h2 class="set-title">Appearance</h2>
        <div class="set-row"><span><b>Theme</b><span class="secondary">Automatic follows this device's light or dark setting</span></span>${themePicker("setTheme")}</div>
      </section>
      <section class="card set-card">
        <h2 class="set-title">Android App</h2>
        ${ANDROID ? `<div class="set-row"><span><b>Kino for Android ${esc(window.KinoAndroid.version())}</b><span class="secondary">You're using the app${TV ? " on a TV" : ""}. Get updates from the same link below.</span></span></div>` : ""}
        ${nativeOk() ? `<div class="set-row"><span><b>Default Player</b><span class="secondary">Kino Player is the app's own, smoothest and the one to use. Android Player is the device's built in one, it can fix broken colours on some TVs but can't play live TV. Web Player is the page's own, the same as on a computer. Live TV always uses the Kino Player (and falls back to the Web Player if that can't open a channel)</span></span>
          <select class="plain" id="pPlayer" aria-label="Default player">${[["exo", "Kino Player"], ["android", "Android Player"], ["web", "Web Player"]].map(([v, l]) => `<option value="${v}" ${v === defaultPlayer() ? "selected" : ""}>${l}</option>`).join("")}</select></div>` : ""}
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
        ${toggle("pLiveAll", pr.live_all_countries, "Show All Countries in Live TV", "Live TV only lists the UK, US, France and Germany. Turn this on to see channels from every other country too")}
        ${toggle("pFake", pr.auto_next_source, "Switch Sources Automatically", "When a copy turns out to be a 30 second placeholder (TorBox sends one when a download didn't really finish) or keeps buffering, the next source plays by itself instead of asking")}
        ${toggle("pPrev", pr.previews !== false, "Autoplay Previews", "Plays a trailer when you hover over a film or show, and in the background of its page. Only on computers, and it uses data")}
        ${toggle("pPrevSnd", pr.preview_sound !== false, "Sound on Previews", "Trailers that play on their own start with the sound on (your browser only allows it once you've clicked something on the page). Turn off to start them muted")}
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
    const sm = $("#splitMe"); if (sm) sm.onclick = () => splitJoint(p);
    const ps = $("#pinSet"), pc = $("#pinChange"), po = $("#pinOff");
    if (ps) ps.onclick = () => setPin(false);
    if (pc) pc.onclick = () => setPin(false);
    if (po) po.onclick = () => setPin(true);
    wireThemePicker($("#setTheme"));
    drawInterests();
    const saveP = async () => {
      const prefs = { audio_lang: $("#pAudioL").value, sub_lang: $("#pSubL").value, sub_size: $("#pSubS").value, autoplay: $("#pAuto").checked, skip_intro: $("#pSkip").checked, share_events: $("#pShare").checked, blur_watched: $("#pBlur").checked, still_watching: Number($("#pStill").value), load_stats: $("#pLoadStats").checked, previews: $("#pPrev").checked, preview_sound: $("#pPrevSnd").checked, auto_next_source: $("#pFake").checked, live_all_countries: $("#pLiveAll").checked };
      const r = await api("/api/profile", { prefs }, "PUT");
      ME.profile = r.profile;
      applyPrefs();
      $("#prefSaved").textContent = "Saved";
      setTimeout(() => $("#prefSaved") && ($("#prefSaved").textContent = ""), 1800);
    };
    ["pAudioL", "pSubL", "pSubS", "pAuto", "pSkip", "pBlur", "pShare", "pStill", "pLoadStats", "pFake", "pPrev", "pPrevSnd"].forEach((id) => $("#" + id).addEventListener("change", saveP));
    const si = $("#setAdminIn"); if (si) si.onclick = () => adminLogin(() => route());
    const pp = $("#pPlayer"); if (pp) pp.onchange = () => {
      const v = pp.value;
      try { localStorage.setItem(NATIVE_KEY, v === "web" ? "0" : "1"); } catch (_) {}
      if (v !== "web" && typeof window.KinoAndroid.setPlayer === "function") window.KinoAndroid.setPlayer(v);
      toast(v === "web" ? "Videos play in the web player" : v === "android" ? "Videos play in the Android player" : "Videos play in the Kino player");
    };
    if (isAdmin()) drawAdminSettings();
  }

  async function drawAdminSettings() {
    const [pr, al] = await Promise.all([api("/api/profiles"), api("/api/admin/allowlist")]);
    const box = $("#adminSettings");
    if (!box) return;
    const mine = al.your_ip;
    const applied = al.applied;
    // Profiles, networks and devices fold away (closed to start with), a redraw keeps the ones that were open
    const wasOpen = new Set($$("details.set-fold[open]", box).map((d) => d.id));
    const fold = (id, title, badge, body) => `<details class="card set-card set-fold" id="${id}" ${wasOpen.has(id) ? "open" : ""}><summary><h2 class="set-title">${title}</h2>
      <span class="badge fold-badge" ${badge ? "" : "hidden"}>${badge || ""}</span><span class="fold-chev" aria-hidden="true">${ic("chevron")}</span></summary><div class="fold-body">${body}</div></details>`;
    box.innerHTML = `
      ${fold("profCard", "Profiles", pr.pending && pr.pending.length ? `${pr.pending.length} asked` : "", `
        ${pr.pending && pr.pending.length ? `<h3 class="sr-sub">Asked For</h3><div class="list">${pr.pending.map((p) => `<div class="li">${pav(p, "xs")}<span class="grow">${esc(p.name)}</span>
          <button class="btn primary small" data-papprove="${p.id}">Approve</button><button class="btn secondary small" data-pdeny="${p.id}">Deny</button></div>`).join("")}</div><h3 class="sr-sub">Profiles</h3>` : ""}
        <div class="list">${pr.profiles.map((p) => `<div class="li">${pav(p, "xs")}<span class="grow">${esc(p.name)}${p.folder ? ` <span class="secondary">${esc(p.folder)}</span>` : ""}${p.locked ? ` <span class="badge">${ic("lock")} Locked</span>` : ""}</span>
          ${p.locked && !p.members ? `<button class="btn secondary small" data-unlock="${p.id}" title="Takes the code off, you never see what it was">Remove Lock</button>` : ""}
          <button class="btn secondary small" data-editp="${p.id}">${ic("pencil")} Edit</button></div>`).join("")}</div>
        <div class="actions end"><button class="btn secondary small" id="addP">${ic("plus")} Add Profile</button></div>`)}
      ${fold("netCard", "Allowed Networks", "", `
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
        <div class="form-err" id="ipErr" role="alert"></div>`)}
      ${fold("devicesCard", "Allowed Devices", "", `<div id="devicesBody"><div class="skel" style="height:80px"></div></div>`)}
      <section class="card set-card" id="liveCard"><div class="skel" style="height:80px"></div></section>
      <section class="card set-card" id="liveFilterCard"><div class="skel" style="height:80px"></div></section>
      <section class="card set-card" id="embedCard"></section>
      <section class="card set-card" id="addonsCard"><div class="skel" style="height:80px"></div></section>
      <section class="card set-card" id="mediaCard"><div class="skel" style="height:80px"></div></section>`;
    drawMediaCard();
    drawDevices();
    drawAddons();
    drawLiveAdmin();
    drawLiveFilter();
    $$("[data-editp]", box).forEach((b) => (b.onclick = () => editProfile(pr.profiles.find((x) => x.id === Number(b.dataset.editp)), () => drawAdminSettings(), pr.folders)));
    $$("[data-papprove]", box).forEach((b) => (b.onclick = async () => { await api(`/api/admin/profiles/${b.dataset.papprove}/approve`, {}); toast("Profile approved"); drawAdminSettings(); }));
    $$("[data-pdeny]", box).forEach((b) => (b.onclick = async () => { await api(`/api/admin/profiles/${b.dataset.pdeny}`, undefined, "DELETE"); toast("Request removed"); drawAdminSettings(); }));
    $$("[data-unlock]", box).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet("Remove this lock?", "Anyone can open the profile again until they set a new code. You never get to see the old code.", "Remove Lock"))) return;
      await api(`/api/admin/profiles/${b.dataset.unlock}/pin-reset`, {}); toast("Lock removed"); drawAdminSettings();
    }));
    $("#addP").onclick = () => editProfile(null, () => drawAdminSettings(), pr.folders);
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

  // Live TV: hide the kinds of channel nobody here watches. Nothing is hidden until it is switched on. Favourites stay, whatever they are
  async function drawLiveFilter() {
    const box = $("#liveFilterCard");
    if (!box) return;
    let r;
    try { r = await api("/api/admin/live/filter"); } catch (e) { box.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; return; }
    if (!$("#liveFilterCard")) return;
    box.innerHTML = `<h2 class="set-title">Hide Channels</h2>
      <p class="secondary set-hint">Switch on the kinds of channel nobody here watches and they leave Live TV and the Guide for everyone. Channels that are favourites stay. Channels that get watched move to the top by themselves.</p>
      ${r.categories.map((c) => `<label class="set-row"><span><b>${esc(c.label)}</b><span class="secondary">${c.count} channel${c.count === 1 ? "" : "s"} in your playlists</span></span><input type="checkbox" class="switch" data-fcat="${c.key}" ${c.on ? "checked" : ""}></label>`).join("")}
      <h3 class="sr-sub">Words in a Channel's Name</h3>
      <div class="int-list">${r.words.length ? r.words.map((w) => `<button class="int-chip" data-fword="${esc(w)}" aria-label="Show channels with ${esc(w)} again" title="Remove"><span>${esc(w)}</span>${ic("close")}</button>`).join("") : `<span class="secondary">No words yet. A channel with the word in its name is hidden.</span>`}</div>
      <form class="ip-form" id="fwForm"><input id="fwWord" placeholder="A word, like shopping" maxlength="40" autocomplete="off"><button class="btn primary small" type="submit">${ic("plus")} Hide</button></form>`;
    const save = async (cats, words, msg) => {
      try { await api("/api/admin/live/filter", { cats, words }, "PUT"); toast(msg); drawLiveFilter(); } catch (e) { toast(e.message, 5000); }
    };
    const cur = () => ({ cats: $$("[data-fcat]", box).filter((c) => c.checked).map((c) => c.dataset.fcat), words: r.words });
    $$("[data-fcat]", box).forEach((c) => (c.onchange = () => save(cur().cats, r.words, c.checked ? "Hidden from Live TV" : "Shown in Live TV again")));
    $$("[data-fword]", box).forEach((b) => (b.onclick = () => save(cur().cats, r.words.filter((x) => x !== b.dataset.fword), "Shown again")));
    $("#fwForm", box).onsubmit = (e) => {
      e.preventDefault();
      const w = $("#fwWord", box).value.trim().toLowerCase();
      if (w.length < 2) return;
      save(cur().cats, [...r.words, w], "Hidden from Live TV");
    };
  }

  // Downloaded media: everything on the Storage Box, where it came from, and delete. Deleted things are remembered so the sync
  // doesnt fetch them again, they only come back if somebody watches that TorBox copy again (or the admin allows it)
  async function drawMediaCard() {
    const box = $("#mediaCard");
    if (!box) return;
    let r;
    try { r = await api("/api/admin/media?skip=0&sort=size"); } catch (e) { box.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; return; }
    if (!$("#mediaCard")) return;
    box.innerHTML = `<h2 class="set-title">Downloaded Media</h2>
      <p class="secondary set-hint">${r.all} file${r.all === 1 ? "" : "s"} on the Storage Box, ${bytes(r.bytes)}. See where each one came from and delete the ones you don't want. Deleted ones are remembered, so the sync doesn't download them again.</p>
      <div class="actions"><button class="btn secondary small" id="mediaOpen">${ic("film")} Manage Downloaded Media</button>${r.deleted ? `<span class="secondary">${r.deleted} deleted and remembered</span>` : ""}</div>`;
    $("#mediaOpen").onclick = () => openMediaManager(drawMediaCard);
  }

  function openMediaManager(done) {
    const s = sheet(`<h2>Downloaded Media</h2><p class="secondary" id="mmSum">Loading</p>
      <div class="mm-bar"><button class="chip on" data-mmtab="files">On the Storage Box</button><button class="chip" data-mmtab="gone">Deleted</button></div>
      <div id="mmBody"></div>`, { wide: true, onClose: () => done && done() });
    const body = $("#mmBody", s.el), sum = $("#mmSum", s.el);
    const st = { tab: "files", q: "", sort: "size", sel: new Set(), rows: [], next: null, total: 0, confirm: false, busy: false };
    const src = (f) => f.source ? `Source: ${f.source}` : "Source: Storage Box";
    const what = (f) => f.kind === "series" && f.season != null ? `${epLabel(f.season, f.episode)} · ` : "";
    const row = (f) => `<div class="sr-row mm-row"><input type="checkbox" class="switch" data-mmsel="${f.id}" ${st.sel.has(f.id) ? "checked" : ""} aria-label="Select ${esc(f.title)}">
      <span class="grow"><b>${esc(f.title)}${f.year ? ` (${esc(f.year)})` : ""}</b><span class="secondary">${esc(what(f))}${esc(f.name)}</span>
        <span class="secondary">${esc(src(f))}${f.quality ? ` · ${esc(f.quality)}` : ""} · added ${ago(f.added)}</span></span>
      <span class="secondary sr-size">${bytes(f.size)}</span>
      <button class="round-btn sm" data-mmdel="${f.id}" aria-label="Delete ${esc(f.title)}" title="Delete">${ic("trash")}</button></div>`;
    const selSize = () => st.rows.filter((f) => st.sel.has(f.id)).reduce((a, f) => a + f.size, 0);
    function drawFiles() {
      body.innerHTML = `<div class="ip-form"><input id="mmQ" type="search" placeholder="Search" value="${esc(st.q)}" aria-label="Search downloaded media">
        <select class="plain" id="mmSort" aria-label="Sort by"><option value="size" ${st.sort === "size" ? "selected" : ""}>Biggest First</option><option value="new" ${st.sort === "new" ? "selected" : ""}>Newest First</option><option value="name" ${st.sort === "name" ? "selected" : ""}>Name</option></select></div>
        <div class="mm-list">${st.rows.map(row).join("") || `<p class="secondary sr-empty">${st.q ? "Nothing matches that." : "Nothing on the Storage Box."}</p>`}</div>
        ${st.next != null ? `<div class="actions"><button class="btn secondary small" id="mmMore">Show More</button></div>` : ""}
        <div class="mm-foot">${st.confirm
          ? `<p class="mm-ask">Delete ${st.sel.size} file${st.sel.size === 1 ? "" : "s"} (${bytes(selSize())}) for everyone? The sync won't download ${st.sel.size === 1 ? "it" : "them"} again unless somebody plays ${st.sel.size === 1 ? "it" : "them"} again.</p>
             <div class="actions end"><button class="btn secondary small" id="mmNo">Cancel</button><button class="btn danger-solid small" id="mmYes" ${st.busy ? "disabled" : ""}>${st.busy ? "Deleting" : "Delete"}</button></div>`
          : `<div class="actions end">${st.sel.size ? `<button class="btn danger-solid small" id="mmDelSel">${ic("trash")} Delete ${st.sel.size} Selected (${bytes(selSize())})</button>` : ""}<button class="btn secondary small" data-close>Close</button></div>`}</div>`;
      $("#mmQ", body).oninput = (e) => { clearTimeout(st.qt); st.qt = setTimeout(() => { st.q = e.target.value; load(true, true); }, 300); };
      $("#mmSort", body).onchange = (e) => { st.sort = e.target.value; load(true); };
      $$("[data-mmsel]", body).forEach((c) => (c.onchange = () => { c.checked ? st.sel.add(c.dataset.mmsel) : st.sel.delete(c.dataset.mmsel); st.confirm = false; drawFiles(); }));
      $$("[data-mmdel]", body).forEach((b) => (b.onclick = () => { st.sel = new Set([b.dataset.mmdel]); st.confirm = true; drawFiles(); const y = $("#mmYes", body); if (y) y.scrollIntoView({ block: "nearest" }); }));
      const more = $("#mmMore", body); if (more) more.onclick = () => load(false);
      const ds = $("#mmDelSel", body); if (ds) ds.onclick = () => { st.confirm = true; drawFiles(); };
      const no = $("#mmNo", body); if (no) no.onclick = () => { st.confirm = false; st.sel = new Set(); drawFiles(); };
      const yes = $("#mmYes", body); if (yes) { yes.onclick = remove; if (TV) yes.focus(); }
      $$("[data-close]", body).forEach((b) => (b.onclick = s.close));
      if (st.keep) { const q = $("#mmQ", body); q.focus(); q.setSelectionRange(q.value.length, q.value.length); st.keep = false; }
    }
    async function load(fresh, keepFocus) {
      if (fresh) { st.rows = []; st.next = null; }
      try {
        const r = await api(`/api/admin/media?q=${encodeURIComponent(st.q)}&sort=${st.sort}&skip=${fresh ? 0 : st.next || 0}`);
        st.rows = st.rows.concat(r.files); st.next = r.next; st.total = r.total;
        sum.textContent = `${r.total} of ${r.all} file${r.all === 1 ? "" : "s"}, ${bytes(r.bytes)}${r.deleted ? `, ${r.deleted} deleted and remembered` : ""}`;
      } catch (e) { body.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; return; }
      st.keep = !!keepFocus;
      drawFiles();
    }
    async function remove() {
      st.busy = true; drawFiles();
      try {
        const r = await api("/api/admin/media/delete", { ids: [...st.sel] });
        toast(r.failed.length ? `Deleted ${r.deleted}, ${r.failed.length} couldn't be deleted: ${r.failed[0].error}` : `Deleted ${r.deleted}, ${bytes(r.freed)} freed`, r.failed.length ? 6000 : 3000);
      } catch (e) { toast(e.message, 5000); }
      st.busy = false; st.confirm = false; st.sel = new Set();
      load(true);
    }
    async function gone() {
      let r;
      try { r = await api("/api/admin/media/deleted"); } catch (e) { body.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; return; }
      sum.textContent = `${r.deleted.length} deleted and remembered`;
      body.innerHTML = `<p class="secondary set-hint">The sync skips these and won't download them again. If somebody plays one again from a source, it is let back in by itself. Allow Again lets it download on the next sync.</p>
        <div class="mm-list">${r.deleted.map((d) => `<div class="sr-row mm-row"><span class="grow"><b>${esc(d.title)}${d.year ? ` (${esc(d.year)})` : ""}</b><span class="secondary">${d.season != null ? esc(epLabel(d.season, d.episode)) + " · " : ""}${esc(d.name)}</span>
            <span class="secondary">Deleted ${ago(d.at)}${d.by ? ` by ${esc(d.by)}` : ""}</span></span><span class="secondary sr-size">${bytes(d.size)}</span>
          <button class="btn secondary small" data-mmok="${d.id}">Allow Again</button></div>`).join("") || `<p class="secondary sr-empty">Nothing deleted yet.</p>`}</div>
        <div class="actions end"><button class="btn secondary small" data-close>Close</button></div>`;
      $$("[data-mmok]", body).forEach((b) => (b.onclick = async () => { try { await api(`/api/admin/media/deleted/${b.dataset.mmok}/allow`, {}); toast("It can download again on the next sync"); gone(); } catch (e) { toast(e.message, 5000); } }));
      $$("[data-close]", body).forEach((b) => (b.onclick = s.close));
    }
    $$("[data-mmtab]", s.el).forEach((b) => (b.onclick = () => {
      st.tab = b.dataset.mmtab;
      $$("[data-mmtab]", s.el).forEach((x) => x.classList.toggle("on", x === b));
      st.tab === "files" ? load(true) : gone();
    }));
    load(true);
  }

  // Allowed devices: works from any network once approved. Each browser or installed app has its own id
  async function drawDevices() {
    const box = $("#devicesBody");
    if (!box) return;
    let r;
    try { r = await api("/api/admin/devices"); } catch (e) { box.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; return; }
    const kind = (ua) => /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /CrKey|TV|Tizen|Web0S/.test(ua) ? "TV" : "Browser";
    const pending = r.devices.filter((d) => d.status === "pending"), allowed = r.devices.filter((d) => d.status === "allowed");
    const row = (d) => `<div class="li dev"><span class="dev-code mono">${esc(d.code)}</span>
      <span class="grow"><b>${esc(d.name || "Unnamed device")}</b>${d.this ? ` <span class="badge">This Device</span>` : ""}<span class="secondary">${esc(kind(d.ua || ""))} · ${d.status === "pending" ? `asked ${ago(d.created)}` : `last used ${ago(d.last_seen)}`}${d.ip ? ` · ${esc(d.ip)}` : ""}</span></span>
      ${d.status === "pending" ? `<button class="btn primary small" data-dev-ok="${d.id}">Allow</button><button class="btn secondary small" data-dev-no="${d.id}">Deny</button>`
        : `<button class="round-btn sm" data-dev-rm="${d.id}" aria-label="Remove ${esc(d.name)}" title="Remove">${ic("trash")}</button>`}</div>`;
    const badge = $("#devicesCard .fold-badge");
    if (badge) { badge.textContent = pending.length ? `${pending.length} waiting` : ""; badge.hidden = !pending.length; }
    box.innerHTML = `
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
  // IPTV playlists for Live TV. Kino checks the channels in the background and hides ones that dont work, english
  // channels (UK, then US) go first. A guide (XMLTV) is optional, lots of playlists name there own
  async function drawLiveAdmin() {
    const box = $("#liveCard");
    if (!box) return;
    let r;
    try { r = await api("/api/admin/live"); } catch (e) { box.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; return; }
    box.innerHTML = `<h2 class="set-title">Live TV</h2>
      <p class="secondary set-hint">Add IPTV playlists (an M3U link) to fill Live TV. Your own TV server (Tvheadend, Jellyfin, ErsatzTV, an HDHomeRun) can make one too. Add a guide (XMLTV) link for the TV Guide, if the playlist doesn't name its own. Channels that don't work get hidden automatically.</p>
      <div class="list">${r.lists.map((l) => `<div class="addon ${l.enabled ? "" : "off"}">
        <div class="addon-top"><span class="addon-logo">${ic("live")}</span>
          <span class="grow"><b>${esc(l.name)}</b> <span class="secondary">${l.count} channels${l.good || l.bad ? `, ${l.good} working, ${l.bad} not` : ""}, ${l.guided ? `${l.guided} with a guide` : "no guide yet"}</span>
            <span class="addon-desc secondary">${esc(l.url)}${l.epg ? `<br>Guide: ${esc(l.epg)}` : ""}</span></span>
          <input type="checkbox" class="switch" data-lon="${l.id}" ${l.enabled ? "checked" : ""} aria-label="Turn ${esc(l.name)} on or off"></div>
        ${l.error ? `<div class="note warn-text">${esc(l.error)}</div>` : ""}
        <div class="addon-foot"><span class="secondary">${l.refreshed ? "Updated " + ago(l.refreshed) : "Loading…"}</span>
          <div class="actions end"><button class="btn secondary small" data-lref="${l.id}">${ic("refresh")} Refresh</button><button class="btn danger small" data-lrm="${l.id}">${ic("trash")} Remove</button></div></div>
      </div>`).join("") || `<div class="secondary" style="padding:8px 0">No playlists yet.</div>`}</div>
      <form class="live-form" id="liveForm">
        <input id="lvName" placeholder="Name, like UK Freeview" autocomplete="off">
        <input id="lvUrl" placeholder="Playlist link (.m3u)" required spellcheck="false" autocapitalize="none" inputmode="url">
        <input id="lvEpg" placeholder="Guide link (XMLTV), leave empty for the free country guides" spellcheck="false" autocapitalize="none" inputmode="url" list="lvGuides">
        <datalist id="lvGuides">${(r.guides || []).map((g) => `<option value="${esc(g.url)}">${esc(g.name)}</option>`).join("")}</datalist>
        <label class="set-row" style="padding:4px 0"><span><b>On My Network</b><span class="secondary">For a TV server at home, lets Kino reach local addresses for this playlist</span></span><input type="checkbox" class="switch" id="lvLocal"></label>
        <div class="actions end"><button class="btn primary small" type="submit" id="lvGo">${ic("plus")} Add Playlist</button></div>
      </form><div class="form-err" id="lvErr" role="alert"></div>`;
    // Embed sources get there own card underneath so they're easy to find
    const ebox = $("#embedCard") || box;
    ebox.innerHTML = `<h2 class="set-title">Live TV Embed Sources</h2>
      <p class="secondary set-hint">For services that give you a JSON list of channels or events with a player page for each. Kino shows them on Live TV and opens their player in a locked down frame. If the list only has ids, add the player link with {id} where the id goes, like https://example.com/embed/{id}.</p>
      <div class="list">${(r.embeds || []).map((x) => `<div class="addon ${x.enabled ? "" : "off"}"><div class="addon-top"><span class="addon-logo">${ic("link")}</span>
          <span class="grow"><b>${esc(x.name)}</b><span class="addon-desc secondary">${esc(x.url)}${x.player ? `<br>Player: ${esc(x.player)}` : ""}</span></span>
          <input type="checkbox" class="switch" data-eon="${x.id}" ${x.enabled ? "checked" : ""} aria-label="Turn ${esc(x.name)} on or off"></div>
        ${x.error ? `<div class="note warn-text">${esc(x.error)}</div>` : ""}
        <div class="addon-foot"><span></span><div class="actions end"><button class="btn danger small" data-erm="${x.id}">${ic("trash")} Remove</button></div></div></div>`).join("")}</div>
      <form class="live-form" id="embForm">
        <input id="emName" placeholder="Name" autocomplete="off">
        <input id="emUrl" placeholder="List link (JSON)" required spellcheck="false" autocapitalize="none" inputmode="url">
        <input id="emPlayer" placeholder="Player link, like {base}/embed/{id} or {playerUrl}" spellcheck="false" autocapitalize="none" inputmode="url">
        <details class="emb-adv"><summary>Where things are in the JSON (optional)</summary>
          <p class="secondary set-hint">Kino finds these by itself most of the time. If not, say where the list is, like <b>data.events</b>, and which field is the title and the picture, like <b>channel_name</b> or <b>meta.logo</b>. In the player link any field of an item goes in curly brackets, <b>{channels.0.channel_id}</b> works too, and <b>{base}</b> is the list's own site.</p>
          <input id="emItems" placeholder="List is at, like data.events" spellcheck="false" autocapitalize="none">
          <input id="emTitle" placeholder="Title field, like channel_name" spellcheck="false" autocapitalize="none">
          <input id="emImage" placeholder="Picture field, like logo_url" spellcheck="false" autocapitalize="none"></details>
        <div class="actions end"><button class="btn secondary small" type="button" id="emTest">Test</button><button class="btn primary small" type="submit" id="emGo">${ic("plus")} Add Source</button></div>
      </form><div class="form-err" id="emErr" role="alert"></div><div id="emOut"></div>`;
    const emBody = () => ({ name: $("#emName").value, url: $("#emUrl").value, player: $("#emPlayer").value, items: $("#emItems").value, title_key: $("#emTitle").value, image_key: $("#emImage").value });
    $("#emTest").onclick = async () => {
      $("#emErr").textContent = ""; $("#emOut").innerHTML = `<span class="spin small"></span>`;
      try {
        const x = await api("/api/admin/embeds/test", emBody());
        $("#emOut").innerHTML = `<div class="emb-test"><b>${x.count} found</b>${x.items.map((it) => `<div class="li"><span class="grow">${esc(it.title)}<br><span class="secondary">${esc(it.player)}</span></span></div>`).join("")}
          <p class="secondary">Top of the JSON: ${esc(x.top.join(", "))}</p>${x.fields.length ? `<p class="secondary">Fields in an item: ${esc(x.fields.join(", "))}</p>` : ""}</div>`;
      } catch (er) { $("#emOut").innerHTML = ""; $("#emErr").textContent = er.message; }
    };
    $("#embForm").onsubmit = async (e) => {
      e.preventDefault();
      const go = $("#emGo"); go.disabled = true;
      try {
        const x = await api("/api/admin/embeds", emBody());
        toast(`Found ${x.count}, like ${x.sample.join(", ")}`, 5000);
        ME.features = null; drawLiveAdmin();
      } catch (er) { $("#emErr").textContent = er.message; go.disabled = false; }
    };
    $$("[data-eon]", ebox).forEach((c) => (c.onchange = async () => { await api(`/api/admin/embeds/${c.dataset.eon}`, { enabled: c.checked }, "PUT").catch(() => {}); ME.features = null; drawLiveAdmin(); }));
    $$("[data-erm]", ebox).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet("Remove this source?", "Its row comes off Live TV for everyone.", "Remove"))) return;
      await api(`/api/admin/embeds/${b.dataset.erm}`, undefined, "DELETE").catch(() => {}); ME.features = null; drawLiveAdmin();
    }));
    $("#liveForm").onsubmit = async (e) => {
      e.preventDefault();
      const go = $("#lvGo"); go.disabled = true; go.innerHTML = `<span class="spin small"></span> Loading channels…`;
      try {
        const x = await api("/api/admin/live", { name: $("#lvName").value, url: $("#lvUrl").value, epg: $("#lvEpg").value, local: $("#lvLocal").checked });
        toast(x.error ? x.error : `${x.count} channels added, checking which work`, 5000);
        ME.features = null; SIDE_KEY = "";
        drawLiveAdmin();
      } catch (er) { $("#lvErr").textContent = er.message; go.disabled = false; go.innerHTML = `${ic("plus")} Add Playlist`; }
    };
    $$("[data-lon]", box).forEach((c) => (c.onchange = async () => { await api(`/api/admin/live/${c.dataset.lon}`, { enabled: c.checked }, "PUT").catch(() => {}); ME.features = null; drawLiveAdmin(); }));
    $$("[data-lref]", box).forEach((b) => (b.onclick = async () => { b.disabled = true; try { await api(`/api/admin/live/${b.dataset.lref}/refresh`, {}); toast("Playlist updated"); } catch (er) { toast(er.message, 5000); } drawLiveAdmin(); }));
    $$("[data-lrm]", box).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet("Remove this playlist?", "Its channels come off Live TV for everyone.", "Remove"))) return;
      await api(`/api/admin/live/${b.dataset.lrm}`, undefined, "DELETE").catch(() => {}); ME.features = null; drawLiveAdmin();
    }));
  }

  async function drawAddons() {
    const box = $("#addonsCard");
    if (!box) return;
    let r;
    try { r = await api("/api/admin/addons"); } catch (e) { box.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; return; }
    // Youtube style addons with nothing but search catalogs (youtubio without cookies or playlists) cant fill a Home row
    const vidType = (t) => !["movie", "series", "anime", "tv"].includes(t);
    const onlySearch = (a) => a.catalogs.some((c) => vidType(c.type)) && !a.catalogs.some((c) => vidType(c.type) && c.home);
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
        ${a.uses.streams ? `<label class="set-row"><span><b>Source Priority</b><span class="secondary">After your TorBox copies and sources that played fine before, Play tries this addon's sources before the rest. First goes before Second and so on</span></span>
          <select class="plain" data-aprio="${a.id}" aria-label="Source priority for ${esc(a.name)}">${[["0", "Normal"], ["1", "First"], ["2", "Second"], ["3", "Third"], ["4", "Fourth"]].map(([v, l]) => `<option value="${v}" ${Number(a.prio || 0) === Number(v) ? "selected" : ""}>${l}</option>`).join("")}</select></label>` : ""}
        ${a.uses.streams ? `<label class="set-row"><span><b>Play Directly</b><span class="secondary">Browsers fetch this addon's videos themselves instead of through the server. Takes the load off the server and the addon sees each viewer's own address, but it doesn't work if the addon ties links to one address, and the app on TVs and phones still goes through the server</span></span>
          <input type="checkbox" class="switch" data-adir="${a.id}" ${a.direct ? "checked" : ""} aria-label="Play ${esc(a.name)} directly"></label>` : ""}
        ${a.config_required ? `<div class="note">This addon has to be set up on its own website first. Paste the link it gives you after setting it up.</div>` : ""}
        ${onlySearch(a) ? `<div class="note">${ic("info")} This addon only has search catalogs, so its videos show up in Search but it has nothing to put on Home. In the addon's own settings add your cookies, a playlist or a channel as a catalog, then install the new link it gives you.</div>` : ""}
        <div class="addon-foot">
        ${a.catalogs.filter((c) => c.home).length ? `<details class="addon-cats"><summary>Home Shelves</summary>${a.catalogs.filter((c) => c.home).map((c) => `
          <label class="set-row"><span><b>${esc(c.name)}</b><span class="secondary">${c.type === "series" ? "TV Shows" : c.type === "movie" ? "Movies" : esc(c.type)}${c.problem ? ` · <span class="warn-text">${esc(c.problem)}, so it's not on Home</span>` : ""}</span></span>
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
      try { const x = await api("/api/admin/addons", { url: $("#addonUrl").value }); toast(`${x.name || "Addon"} installed`); ME.features = null; drawAddons(); }
      catch (er) { $("#addonErr").textContent = er.message; b.disabled = false; }
    };
    $$("[data-adir]", box).forEach((c) => (c.onchange = async () => {
      try { await api(`/api/admin/addons/${c.dataset.adir}`, { direct: c.checked }, "PUT"); toast(c.checked ? "Browsers play it directly" : "Back through the server"); } catch (er) { toast(er.message, 5000); c.checked = !c.checked; }
    }));
    $$("[data-aprio]", box).forEach((c) => (c.onchange = async () => {
      try { await api(`/api/admin/addons/${c.dataset.aprio}`, { prio: Number(c.value) }, "PUT"); toast(c.value === "0" ? "Back to the normal order" : `Its sources are tried ${["", "first", "second", "third", "fourth"][Number(c.value)]}`); } catch (er) { toast(er.message, 5000); }
    }));
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
      try { await api(`/api/admin/addons/${a.id}`, undefined, "DELETE"); toast("Addon removed"); ME.features = null; drawAddons(); } catch (er) { toast(er.message, 5000); }
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
    const post = s.poster ? `<img src="${img(s.poster, 0, 342)}" alt="" data-fallback="hide">` : `<div class="ph" style="--h:${hue(headline)}"></div>`;

    b.innerHTML = `<div class="cards">
      <section class="card now-card span-12">
        ${c && c.background ? `<div class="bgblur" style="background-image:url(&quot;${esc(img(c.background, 0, 640))}&quot;)"></div>` : ""}
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
      <div id="stress"></div><div id="srvErrors"></div><div id="backups"></div><div id="appLog"></div><div id="storageReview"></div></main>`;
    wireTopbar();
    startPoll(drawServer, 3000);
    drawStress();
    drawSrvErrors();
    drawBackups();
    drawAppLog();
    drawStorageReview();
  }

  // Stress test: pretend viewers on the server to see if it copes before handing out access
  async function drawStress() {
    const box = $("#stress");
    if (!box) return;
    const r = await api("/api/admin/stress").catch(() => null);
    if (!r || !$("#stress")) return;
    const running = r.state === "running" || r.state === "starting";
    const res = r.result;
    const last = (r.samples || []).slice(-1)[0];
    const pct = running && r.seconds ? Math.min(100, ((r.samples || []).length / r.seconds) * 100) : 0;
    const f1 = (x) => (x == null ? "-" : x.toFixed(2));
    box.innerHTML = `<section class="card backups"><h2 class="set-title">Stress Test</h2>
      <p class="secondary set-hint">Runs pretend viewers on the server for a while: some converting a film exactly like the player does, the rest reading a film off the Storage Box at a normal streaming rate like direct play. Each one either keeps up with real time or it doesn't, that's what decides if playback would stutter. Real people watching at the same time might notice it. It can't test your internet upload, for that you need about 8 Mbps per person.</p>
      ${running ? `<div class="state-line running"><span class="dot"></span>Running ${r.viewers} pretend viewers (${r.converting} converting, ${r.direct} direct)…</div>
          <div class="progress thin" style="margin:12px 0"><i style="width:${pct}%"></i></div>
          ${last ? `<div class="note">CPU ${Math.round(last.cpu)}% · memory ${bytes(last.mem)} · Storage Box ${rate(last.disk)}</div>` : ""}
          <div class="actions"><button class="btn secondary small" id="stStop">Stop</button></div>`
        : `<div class="stress-form">
          <label><span>People</span><input type="number" id="stN" min="1" max="40" value="${r.viewers || 20}"></label>
          <label><span>Converting</span><select class="plain" id="stC">${[0, 25, 50, 75, 100].map((x) => `<option value="${x}" ${x === 50 ? "selected" : ""}>${x}%</option>`).join("")}</select></label>
          <label><span>For</span><select class="plain" id="stS">${[30, 60, 120, 300].map((x) => `<option value="${x}" ${x === 60 ? "selected" : ""}>${x < 60 ? x + " seconds" : x / 60 + " minute" + (x > 60 ? "s" : "")}</option>`).join("")}</select></label>
          <button class="btn primary small" id="stGo">Run Test</button></div>`}
      ${res ? `<div class="stress-res ${res.ok ? "good" : "bad"}"><b>${res.ok ? `${r.viewers} people at once looks fine` : "It struggled: " + esc(res.problems.join(", "))}</b>
          <div class="list">
            ${res.convert.n ? `<div class="li"><span class="grow">Converted streams</span><span class="r">${res.convert.ok} of ${res.convert.n} kept up, slowest ${f1(res.convert.slowest)}× real time${res.convert.reencoding ? `, ${res.convert.reencoding} fully re-encoding` : ""}</span></div>` : ""}
            ${res.direct.n ? `<div class="li"><span class="grow">Direct play from the Storage Box</span><span class="r">${res.direct.ok} of ${res.direct.n} kept up, ${f1(res.direct.total_mbps)} Mbps in total</span></div>` : ""}
            <div class="li"><span class="grow">CPU</span><span class="r">peak ${Math.round(res.cpu_peak)}%, average ${Math.round(res.cpu_avg)}%</span></div>
            <div class="li"><span class="grow">Memory</span><span class="r">peak ${bytes(res.mem_peak)} (${Math.round(res.mem_pct_peak)}%)</span></div>
            <div class="li"><span class="grow">Internet upload needed</span><span class="r">about ${res.upload_needed_mbps} Mbps for ${r.viewers} people in 1080p</span></div>
          </div></div>` : r.state === "failed" ? `<div class="err-note">${esc(r.error || "The test failed")}</div>` : ""}
    </section>`;
    const go = $("#stGo");
    if (go) go.onclick = async () => {
      try { await api("/api/admin/stress", { viewers: Number($("#stN").value), converted: Number($("#stC").value), seconds: Number($("#stS").value) }); setTimeout(drawStress, 800); }
      catch (e) { toast(e.message, 5000); }
    };
    const sp = $("#stStop"); if (sp) sp.onclick = async () => { await api("/api/admin/stress/stop", {}).catch(() => {}); };
    if (running) setTimeout(() => { if ($("#stress") === box) drawStress(); }, 2000);
  }

  // Errors on the server that weren't handled, so a "Request failed" on someone's phone can be looked up
  async function drawSrvErrors() {
    const r = await api("/api/admin/errors").catch(() => null);
    const box = $("#srvErrors");
    if (!r || !box) return;
    box.innerHTML = `<section class="card backups"><h2 class="set-title">Server Errors</h2>
      <p class="secondary set-hint">Things that went wrong on the server since it last started. Cleared when Kino restarts.</p>
      ${r.items.length ? "" : `<div class="note">Nothing has gone wrong since Kino last started.</div>`}
      <div class="list">${r.items.slice(0, 15).map((x) => `<div class="li"><span class="grow"><b>${esc(x.path)}</b><br><span class="secondary">${esc(x.error)}</span></span><span class="r">${esc(when(x.at))}</span></div>`).join("")}</div></section>`;
  }

  // What the tv apps reported, mainly the page crashing or being closed by android for memory
  async function drawAppLog() {
    const r = await api("/api/admin/clientlog").catch(() => null);
    const box = $("#appLog");
    if (!r || !box || !r.items.length) return;
    box.innerHTML = `<section class="card backups"><h2 class="set-title">App Problems</h2>
      <p class="secondary set-hint">When the Kino app on a TV or phone has to reload a page it reports it here, so it's clear which pages are too heavy for which devices. Cleared when Kino restarts.</p>
      <div class="list">${r.items.slice(0, 15).map((x) => `<div class="li"><span class="grow"><b>${esc(x.kind)}</b> on ${esc(x.page || "?")}<br><span class="secondary">${esc([x.device, x.profile, x.detail].filter(Boolean).join(" · "))}</span></span><span class="r">${esc(when(x.at))}</span></div>`).join("")}</div></section>`;
  }

  // Nightly copies of the database on the Storage Box
  async function drawBackups() {
    const r = await api("/api/admin/backups").catch(() => null);
    const box = $("#backups");
    if (!r || !box) return;
    const okLine = r.error && (!r.last || r.error_at > r.last)
      ? `<div class="state-line error"><span class="dot"></span>Last backup failed: ${esc(r.error)}</div>`
      : r.last ? `<div class="state-line running"><span class="dot"></span>Last backup ${esc(when(r.last))}</div>` : `<div class="state-line"><span class="dot"></span>No backup yet, the first one runs a few minutes after Kino starts</div>`;
    box.innerHTML = `<section class="card backups">
      <div class="sr-head"><div><h2 class="set-title">Backups</h2>
        <p class="secondary set-hint">Profiles, watch history, ratings, addons and devices are copied to the Storage Box every night. The last 14 nights and one a month for 6 months are kept.</p></div>
        <button class="btn secondary small" id="bkNow">${ic("refresh")} Back Up Now</button></div>
      ${okLine}
      ${r.backups.length ? `<div class="list bk-list">${r.backups.slice(0, 8).map((b) => `<div class="li"><span class="grow">${esc(when(b.at))}</span><span class="r">${bytes(b.size)}</span>
        <a class="round-btn sm" href="/api/admin/backups/${encodeURIComponent(b.name)}" download aria-label="Download backup from ${esc(when(b.at))}" title="Download">${ic("download")}</a></div>`).join("")}</div>
        ${r.backups.length > 8 ? `<p class="secondary sr-empty">${r.backups.length - 8} older backup${r.backups.length - 8 === 1 ? "" : "s"} kept as well.</p>` : ""}` : ""}
      <p class="secondary sr-empty">To restore one, see Restoring a Backup in the README.</p>
    </section>`;
    $("#bkNow").onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { await api("/api/admin/backups", {}); toast("Backup saved"); } catch (x) { toast(x.message, 6000); }
      drawBackups();
    };
  }

  // What could be cleared off the Storage Box, things everyone has watched and things nobody started in months
  async function drawStorageReview() {
    const r = await api("/api/admin/storage").catch(() => null);
    const box = $("#storageReview");
    if (!r || !box) return;
    const row = (t, sub) => `<div class="sr-row"><span class="fm-post">${t.poster ? `<img src="${img(t.poster, 0, PW())}" alt="" data-fallback="hide">` : ""}</span>
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
    const up = await api("/api/admin/upstream").catch(() => null);
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
      ${up ? `<section class="card span-12"><h3>Source Hosts</h3>
        <div class="note" style="margin:2px 0 10px">What the server asked other hosts for in the last hour. A host that says "too many requests" is left alone for as long as it asks.
          ${up.merged ? `${up.merged} identical request${up.merged === 1 ? " was" : "s were"} merged into one. ` : ""}${up.stale ? `${up.stale} time${up.stale === 1 ? "" : "s"} an older answer was used. ` : ""}${up.ips.length ? `Leaving from ${up.ips.length} addresses.` : "Leaving from one address (set OUTBOUND_IPS to spread it)."}</div>
        ${up.hosts.length ? `<div class="list">${up.hosts.map((h) => `<div class="li"><span class="grow"><b>${esc(h.host)}</b> <span class="secondary">${h.list} data, ${h.check} checks, ${h.play} video · ${h.open} open now, most at once ${h.peak}</span>
          ${h.last.length ? `<span class="addon-desc secondary">Said too many requests ${h.last.map((l) => `${l.ago < 90 ? l.ago + "s" : Math.round(l.ago / 60) + " min"} ago with ${l.open} open and ${l.recent} requests in the minute before`).join(", ")}</span>` : ""}</span>
          <span class="r">${h.wait ? `<span class="badge warn">Waiting ${h.wait}s</span>` : h.limited ? `<span class="badge warn">${h.limited} limited</span>` : `<span class="badge">Fine</span>`}</span></div>`).join("")}</div>` : `<div class="secondary">Nothing asked yet.</div>`}</section>` : ""}
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
    // On a tv the cards with nothing to press in them can still be landed on, so the remote steps down through them
    if (TV) $$(".card", b).forEach((c, n) => { if (!$("a,button,input,select", c)) { c.tabIndex = 0; c.dataset.card = String(n); } });
  }

  // ---------------------------------------------------------- polling
  // Finds the same control again after a redraw. It used to look for the first thing on the page with the same text,
  // so with the same film in two rows a background refresh (admins get one every few seconds on Home) threw the
  // remote over to the other row without scrolling to it. Now it only steps in when focus actualy got lost, and
  // looks in the same row first
  function focusKey(el) {
    if (!el || el === document.body || !app.contains(el)) return null;
    const k = { el, tag: el.tagName, text: el.textContent.trim() };
    if (el.id) k.sel = `#${CSS.escape(el.id)}`;
    else {
      const d = Object.keys(el.dataset).find((x) => x !== "poster");
      if (d) k.sel = `[data-${d.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}="${CSS.escape(el.dataset[d])}"]`;
    }
    const sec = el.closest("section[aria-label]");
    if (sec) {
      k.sec = sec.getAttribute("aria-label");
      const same = $$(k.tag, sec);
      k.idx = same.indexOf(el);
    }
    return k;
  }
  function refocus(k) {
    if (!k) return;
    const a = document.activeElement;
    // Still on something real (the same thing, or wherever the remote went while this was loading), leave it be
    if (a && a !== document.body && a.isConnected) return;
    if (k.el.isConnected) { k.el.focus({ preventScroll: true }); return; }
    const scope = (k.sec && $$("section[aria-label]", app).find((x) => x.getAttribute("aria-label") === k.sec)) || app;
    let el = k.sel ? $(k.sel, scope) : null;
    if (!el && scope !== app && k.idx >= 0) { const c = $$(k.tag, scope)[k.idx]; if (c && c.textContent.trim() === k.text) el = c; }
    if (!el) el = $$(k.tag, scope).find((x) => x.textContent.trim() === k.text);
    if (!el) return;
    el.focus({ preventScroll: true });
    // A redrawn row starts scrolled back to the start, so the card gets brought back into view
    const row = el.closest(".row");
    if (row) { const er = el.getBoundingClientRect(), rr = row.getBoundingClientRect(); if (er.left < rr.left || er.right > rr.right) row.scrollLeft += er.left - rr.left - (rr.width - er.width) / 2; }
  }
  function startPoll(fn, ms) {
    stopPoll();
    // Each poll gets its own object, so a loop thats been stopped and restarted while a fetch was in flight dies instead of going on as an orphan
    const mine = POLL = { t: null };
    const tick = async () => {
      const k = focusKey(document.activeElement);
      try { await fn(); } catch (e) { if (e.message !== "pick profile") console.warn(e); }
      if (POLL !== mine) return;
      refocus(k);
      mine.t = setTimeout(tick, document.hidden ? ms * 5 : ms);
    };
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
    $("#plBg").innerHTML = art && art.background ? `<img src="${img(art.background, 0, 960)}" alt="" data-fallback="hide">` : "";
    loadLogo(art, name);
    $("#plStats").innerHTML = "";
    el.classList.toggle("no-stats", !LOAD.stats);
    el.hidden = false;
    pl.el.classList.add("loading");  // the controls under the loading screen cant be used (or seen, or reached with a key) until it goes
    hideMenus();
    requestAnimationFrame(() => el.classList.add("on"));
    clearInterval(LOAD.timer);
    LOAD.timer = setInterval(drawLoad, 500);
  }
  function loadLogo(art, name) {
    const box = $("#plLogo");
    if (art && art.logo) box.innerHTML = `<img src="${img(art.logo, 1, LW())}" alt="${esc(name || "")}" data-fallback="text" data-cls="pl-name">`;
    else box.innerHTML = `<div class="pl-name">${esc(name || "")}</div>`;
  }
  function loadArt(art, name) {
    if (!LOAD.on || !art) return;
    if (art.background && !$("#plBg img")) $("#plBg").innerHTML = `<img src="${img(art.background, 0, 960)}" alt="" data-fallback="hide">`;
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
    pl.el.classList.remove("loading");
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
  // The player chosen in Settings: the app's own (exo), the device's (android) or the page's (web)
  const defaultPlayer = () => {
    if (!useNative()) return "web";
    try { return typeof window.KinoAndroid.player === "function" && window.KinoAndroid.player() === "android" ? "android" : "exo"; } catch (_) { return "exo"; }
  };
  let NATIVE = null;

  let NATIVE_BUSY = 0;
  async function nativePlay(fid, opts) {
    // A second press while the first is still getting ready is ignored, it used to open two players
    if (Date.now() - NATIVE_BUSY < 6000) return;
    NATIVE_BUSY = Date.now();
    toast("Starting…", 2500);
    let info;
    try { info = await api(`/api/file/${fid}`); } catch (e) { NATIVE_BUSY = 0; toast(e.message, 5000); return; }
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
    const n = info.next;
    const art = { background: (t && t.background) || (info.art && info.art.background) || null, logo: (t && t.logo) || (info.art && info.art.logo) || null };
    setTimeout(() => (NATIVE_BUSY = 0), 3000);
    window.KinoAndroid.playNative(JSON.stringify({
      isStream: !!info.stream, torbox: !!(info.stream && !info.src), moreSources: moreSources(fid),
      art, video: info.video || {}, credits: info.credits || 0, autoplay: prefs.autoplay !== false, loadStats: prefs.load_stats !== false,
      subSize: prefs.sub_size || "m", titleId: info.title_id || (t && t.id) || null,
      next: n ? { id: n.id || null, video_id: n.video_id || null, name: n.name ? nice(n.name) : null, season: n.season ?? null, episode: n.episode ?? null, thumbnail: n.thumbnail || null } : null,
      base: location.origin, ua: navigator.userAgent, fid, url, title: (t && t.name) || info.show || info.name, sub,
      start: opts.from != null ? opts.from : info.resume || 0, duration: info.duration || 0,
      audioN, audioChosen: audioN !== info.default_audio, audioLang: langCode(prefs.audio_lang), subLang: langCode(prefs.sub_lang), subs,
      checkFake: !!(info.stream && (info.kind === "movie" || info.kind === "series")), expect: info.expect || 0, autoNextSource: !!prefs.auto_next_source,
      intro: info.intro, autoSkip: !!prefs.skip_intro, stillMins: Number(prefs.still_watching) || 0, dovi: !!(info.video && info.video.dovi),
      forceHls: !!(info.video && info.video.codec && !["h264", "hevc", "av1", "vp9", "mpeg4", "mpeg2video", "vp8"].includes(info.video.codec)),
    }));
  }
  // English to en and so on, exoplayer matches tracks by these codes
  const langCode = (l) => { if (!l) return ""; const c = LANG_CODES[l] || LANG_CODES[String(l).split(" ")[0]]; return c ? c[0] : String(l).length <= 3 ? String(l).toLowerCase() : ""; };
  window.kinoNativeDone = (r) => {
    const cur = NATIVE; NATIVE = null; NATIVE_BUSY = 0;
    if (!r) return;
    // Live tv just closes, unless they asked for the web player from its error box. The remote goes back to the channel that was
    // on (the player says which, up and down in it change channel), also when the page was reloaded while it was open
    // The Kino player gave up on a channel: the page's own player (hls.js, what a computer uses) takes it over, so it plays instead of an error
    if (r.live && r.error && cur && cur.live && !cur.live.rec) {
      const ch = (cur.live.list || []).find((c) => c.id === r.fid) || cur.live.ch;
      toast("The Kino player couldn't open that channel, trying the web player", 4000);
      return playLive(ch, cur.live.list, { web: true });
    }
    if (r.live && !(cur && cur.live && cur.live.rec)) setTimeout(() => liveBackFocus(r.fid), 150);
    if (cur && cur.live) { if (cur.live.rec && location.hash.startsWith("#/live/rec")) setTimeout(softRoute, 300); return; }
    if (r.live) return;
    // A broken source: the next one plays straight away
    if (r.sourceFailed && nextSource(r.fid, r.fake ? 0 : r.pos, r.why || null)) return;
    // Otherwise the player only hands back an error when someone picked Web Player in its error box
    if (r.error && !r.sourceFailed) return playFile(r.fid, { ...(cur ? cur.opts : {}), from: r.pos, web: true });
    const n = cur ? cur.info.next : r.next, auto = cur ? !cur.info.prefs || cur.info.prefs.autoplay !== false : r.autoplay !== false;
    if (r.ended && n && auto) return nextFrom(n, cur ? cur.opts.title : null, r.titleId);
    // Redraws the page so resume bars and watched ticks are right
    if (ME.profile) setTimeout(softRoute, 300);
  };
  // The next episode, also when the page was reloaded while the player was open and only the ids are left
  async function nextFrom(n, title, titleId) {
    if (n.video_id) return playEpisode(n.video_id, n);
    const t = title || (titleId ? await api(`/api/title/${titleId}`).catch(() => null) : null);
    playFile(n.id, { title: t, from: 0 });
  }
  if (ANDROID) {
    // After the page comes back (a low memory tv lets it go while the player is open) it picks up the player's result,
    // and tells the server if the page crashed last time so heavy pages can be found
    setTimeout(() => {
      try {
        const r = window.KinoAndroid.takeResult && window.KinoAndroid.takeResult();
        if (r) { RELOADED = true; window.kinoNativeDone(JSON.parse(r)); }
      } catch (_) {}
      try {
        const c = window.KinoAndroid.lastCrash && window.KinoAndroid.lastCrash();
        if (c) {
          const j = JSON.parse(c);
          fetch("/api/clientlog", { method: "POST", headers: { "X-Kino": "1", "Content-Type": "application/json" }, credentials: "same-origin",
            body: JSON.stringify({ kind: j.crashed ? "page crashed" : "page killed for memory", page: (j.url || "").replace(location.origin, ""), device: j.device,
              detail: `${j.free_mb} MB free of ${j.total_mb} MB, Android ${j.android}` }) }).catch(() => {});
        }
      } catch (_) {}
    }, 1200);
  }
  // Android saying memory is low: every picture not on screen right now is let go
  window.kinoTrim = () => { RECYCLE_TIGHT = true; recycle(); setTimeout(() => (RECYCLE_TIGHT = false), 60000); };

  let PLAY_N = 0;
  let RELOADED = false;  // the app reloaded this page after the player, so theres no back history to go by
  async function playFile(fid, opts = {}) {
    if (!opts.web && useNative()) return nativePlay(fid, opts);
    // Each press gets a number, anything still loading from an earlier press stops when it sees a newer one
    const my = ++PLAY_N;
    stopPreviews(); closeTrailer();
    const chain = !!opts.chain && LOAD.on;
    closePlayer(true, chain);
    clearInterval(HERO_T);
    pl.el.hidden = false;
    document.body.style.overflow = "hidden";
    spinner(false);
    const tt = opts.title;
    if (!chain) loadShow(tt ? { background: tt.background, logo: tt.logo } : opts.art, tt ? tt.name : opts.name || "");
    loadStep(opts.note || "Getting the file ready");
    $("#pMsg").hidden = true;
    $("#upNext").hidden = true;
    $("#skipIntro").hidden = true;
    $("#subsLayer").innerHTML = "";
    let info;
    try { info = await api(`/api/file/${fid}`); } catch (e) {
      if (my !== PLAY_N) return;
      // A source that wont even open moves on to the next one by itself (that was a dead end before, with only a message)
      if (SOURCES && SOURCES.list.some((x) => x.id === fid) && moreSources(fid) && nextSource(fid, opts.from, /busy|429/i.test(e.message) ? "That source is busy" : "That source didn't open")) return;
      loadHide(); showMsg("Can't play this file", e.message); return;
    }
    if (my !== PLAY_N || pl.el.hidden) return;
    loadArt(info.art, (opts.title && opts.title.name) || info.show || info.name);
    if (!$("#plLogo").textContent.trim() && !$("#plLogo img")) loadLogo(info.art, info.show || info.name);
    pl.info = info; pl.cues = null; pl.subId = null; pl.upNextShown = false; pl.introSkipped = false; pl.fakeAsked = false; pl.greenChecked = false; pl.frameAt = 0;
    pl.playedAt = 0; pl.stalls = []; pl.bufStart = 0; pl.lastSeek = 0; pl.stallAskedAt = 0; pl.sameRetries = 0; pl.ad = 0;
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
      // An addon set to Direct Play gives a link of its own that this device fetches itself (the server isn't carrying the video), if that
      // doesn't play it goes back through the server below
      let viaCdn = !!info.cdn;
      pl.v.src = info.cdn || info.src;
      // A debrid source has to get the file ready first, which can take a while (the server gives up on it after 15 seconds)
      const slowT = setTimeout(() => { if (pl.info === info && my === PLAY_N && LOAD.on) loadStep("Still waiting, the source may be getting it ready"); }, 6000);
      pl.v.addEventListener("loadedmetadata", () => clearTimeout(slowT), { once: true });
      const from = opts.from != null ? opts.from : info.resume || 0;
      pl.v.addEventListener("loadedmetadata", () => { if (pl.info !== info || my !== PLAY_N) return; if (from && from < pl.v.duration - 10) pl.v.currentTime = from; }, { once: true });
      let retried = false;
      pl.v.addEventListener("error", async function onErr() {
        if (pl.info !== info || my !== PLAY_N) return;
        clearTimeout(slowT);
        const code = pl.v.error && pl.v.error.code;
        if (code === 1) { pl.v.addEventListener("error", onErr, { once: true }); return; }   // aborted on purpose, not a real problem
        if (viaCdn) {
          viaCdn = false;
          const at0 = pl.v.currentTime || (opts.from || 0);
          pl.v.addEventListener("error", onErr, { once: true });
          pl.v.src = info.src;
          pl.v.addEventListener("loadedmetadata", () => { if (pl.info !== info || my !== PLAY_N) return; if (at0) pl.v.currentTime = at0; }, { once: true });
          pl.v.play().catch(() => {});
          return;
        }
        // Online sources often stall on the first try, one more go before saying it won't play
        // A format this browser can't play, or still failing after the retry: the next source if there is one
        // It was playing fine and then broke, nearly always right after a seek: the same source gets another go from
        // there instead of being called broken and swapped out
        if (pl.playedAt && pl.sameRetries < 2) {
          pl.sameRetries++;
          const at = pl.v.currentTime || 0;
          pl.v.addEventListener("error", onErr, { once: true });
          spinner(true);
          pl.v.src = info.src;
          pl.v.addEventListener("loadedmetadata", () => { if (pl.info !== info || my !== PLAY_N) return; if (at) pl.v.currentTime = at; }, { once: true });
          pl.v.play().catch(() => {});
          return;
        }
        if ((retried || code !== 2) && moreSources(info.id)) { closePlayer(true, true); if (nextSource(info.id, opts.from)) return; }
        if (!retried && code === 2) {
          retried = true;
          const at = pl.v.currentTime || (opts.from || 0);
          pl.v.addEventListener("error", onErr, { once: true });
          pl.v.src = info.src;
          pl.v.addEventListener("loadedmetadata", () => { if (pl.info !== info || my !== PLAY_N) return; if (at) pl.v.currentTime = at; }, { once: true });
          pl.v.play().catch(() => {});
          return;
        }
        // Asks the server what went wrong, so a blocked redirect says where it was going instead of a vague message
        let why = "The source may be slow, or this browser can't play its format. Try another source or save it to the Library.";
        try { const r = await fetch(info.src, { headers: { Range: "bytes=0-0" }, credentials: "same-origin" }); if (!r.ok) { const j = await r.json().catch(() => null); if (j && j.detail) why = j.detail; } } catch (_) {}
        showMsg("This copy won't play here", why, info.download ? `<a class="btn secondary small" href="${esc(info.download)}">${ic("download")} Download instead</a>` : "");
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
    const dlBtn = info.download ? `<a class="btn secondary small" href="${esc(info.download)}&save=1">${ic("download")} Download</a>
      <button class="btn secondary small" id="copyLink">${ic("link")} Copy link for VLC</button>` : "";

    if (info.direct && codecOk(vcodec) && pl.audio === info.default_audio) {
      pl.mode = "direct";
      loadStep("Direct play");
      loadNote([vcodec && vcodec.toUpperCase(), ...(info.badges || [])].filter(Boolean).join(" · "));
      pl.v.src = `/api/stream/${fid}/direct`;
      pl.v.addEventListener("loadedmetadata", () => { if (pl.info !== info || my !== PLAY_N) return; if (start) pl.v.currentTime = start; }, { once: true });
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
    // Moving on to another source closes this one first, anything still on its way here from the old one has nothing to start
    if (!pl.info) return;
    const my = PLAY_N;
    // Every call gets its own number, if a newer one starts while this waits for the server this one stands down
    const mine = pl.hlsSeq = (pl.hlsSeq || 0) + 1;
    if (!LOAD.on) spinner(true);
    $("#pMsg").hidden = true;
    if (pl.hls) { pl.hls.destroy(); pl.hls = null; }
    // hls.js loads while the server gets the stream going, Safari plays it itself and never needs it
    const hp = isSafari && pl.v.canPlayType("application/vnd.apple.mpegurl") ? null : loadHls().catch(() => {});
    let r;
    const vc = pl.info.video || {};
    loadStep(vc.codec && !["h264", "hevc", "av1", "vp9"].includes(vc.codec) ? "Converting the video for this screen" : "Starting the stream");
    const au = (pl.info.audio || []).find((x) => x.n === pl.audio);
    loadNote([au && au.label, vc.dovi ? "Dolby Vision to HDR" : "", t > 1 ? `from ${clock(t)}` : ""].filter(Boolean).join(" · "));
    try {
      r = await api(`/api/play/${pl.info.id}`, { t, audio: pl.audio, hevc: codecOk("hevc"), ad: pl.ad || 0 });
    } catch (e) {
      if (my !== PLAY_N || !pl.info || mine !== pl.hlsSeq) return;
      loadHide();
      showMsg("Playback couldn't start", e.message, pl.info.download ? `<a class="btn secondary small" href="${esc(pl.info.download)}&save=1">${ic("download")} Download instead</a>` : "");
      return;
    }
    if (pl.el.hidden || my !== PLAY_N || mine !== pl.hlsSeq) { api(`/api/play/${r.sid}/stop`, {}).catch(() => {}); return; }
    if (hp) {
      await hp;
      if (pl.el.hidden || my !== PLAY_N || mine !== pl.hlsSeq) { api(`/api/play/${r.sid}/stop`, {}).catch(() => {}); return; }
    }
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
    // The stream starts on a keyframe, which can be a few seconds before the spot you asked for (that's also what Resync
    // Now does, it asks for where you are). Once enough of it is made it jumps forward to the exact spot, the sound is
    // lined up with the picture from the start so this is safe
    const lead = t - r.offset, sid0 = r.sid;
    if (lead > 1 && lead < 40) {
      const jump = () => {
        if (pl.sid !== sid0) return pl.v.removeEventListener("progress", jump);
        const se = pl.v.seekable.length ? pl.v.seekable.end(pl.v.seekable.length - 1) : 0;
        if (pl.v.readyState >= 1 && se > lead + 1) { pl.v.removeEventListener("progress", jump); pl.v.currentTime = lead; }
      };
      pl.v.addEventListener("progress", jump);
      setTimeout(() => pl.v.removeEventListener("progress", jump), 20000);
    }
  }

  function seekTo(target) {
    if (pl.info && pl.info.live) return;
    pl.lastSeek = Date.now();
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
    if (!pl.info || pl.info.live || pl.info.recording || !total()) return;
    api("/api/progress", { file_id: pl.info.id, pos: pos(), dur: total() }).catch(() => {});
  }

  // Tells tracking addons what's playing, only when the profile has turned that on
  function sendEvent(action) {
    if (!pl.info || pl.info.live || pl.info.recording || !ME.profile || !ME.profile.prefs || !ME.profile.prefs.share_events) return;
    api("/api/event", { file_id: pl.info.id, action, pos: pos(), dur: total() }).catch(() => {});
  }

  function closePlayer(keepOpen, keepLoading) {
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
    const wasLive = pl.el.classList.contains("live");
    const lastLive = wasLive && LIVE_NOW && LIVE_NOW.list[LIVE_NOW.i] ? LIVE_NOW.list[LIVE_NOW.i].id : null;
    if (wasLive) {
      pl.el.classList.remove("live"); LIVE_NOW = null;
      $("#pBack").innerHTML = ic("back10"); $("#pBack").setAttribute("aria-label", "Back 10 seconds"); $("#pBack").title = "Back 10 Seconds";
      $("#pFwd").innerHTML = ic("fwd10"); $("#pFwd").setAttribute("aria-label", "Forward 10 seconds"); $("#pFwd").title = "Forward 10 Seconds";
    }
    if (!keepOpen) {
      // Closed on purpose: a source that was waiting its turn in the skip chain must not open the player again (it did, dragging you back in)
      PLAY_N++;
      if (SOURCES && SOURCES.timer) { clearTimeout(SOURCES.timer); SOURCES.timer = null; }
    }
    if (!keepLoading) loadHide();  // moving along the sources list keeps the loading screen up instead of fading it out and back in
    $("#pStill").hidden = true; clearTimeout(STILL.t);
    if (!keepOpen && wasOpen) {
      pl.el.hidden = true;
      document.body.style.overflow = "";
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      // Redraws the page behind so resume bars and watched ticks are up to date
      if (ME.profile && (location.hash.startsWith("#/title/") || location.hash.startsWith("#/discover/") || location.hash === "#/home" || !location.hash)) setTimeout(softRoute, 400);
      if (wasLive) setTimeout(() => liveBackFocus(lastLive), 60);
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

  // Live channels and recordings have no subtitle, audio track or speed menus to show, so the buttons stay out of the way
  function liveChrome() { ["#pSubs", "#pAudio", "#pSpeed"].forEach((b) => ($(b).hidden = true)); hideMenus(); }

  function buildMenus() {
    const info = pl.info;
    $("#pSpeed").hidden = false;
    $("#pAudio").innerHTML = ic("audio");
    $("#pAudio").hidden = !!(info.live || info.recording) && info.audio.length < 2;
    // Audio tracks, then Audio Sync: resync on the spot, or shift the sound earlier or later if a file is out
    const ads = [[-1, "1s Earlier"], [-0.5, "0.5s Earlier"], [-0.25, "0.25s Earlier"], [0, "In Sync"], [0.25, "0.25s Later"], [0.5, "0.5s Later"], [1, "1s Later"]];
    $("#mAudio").innerHTML = (info.audio.length > 1 ? info.audio.map((a) => `<button data-a="${a.n}"><span class="chk">${a.n === pl.audio ? ic("check") : ""}</span>${esc(a.label)}</button>`).join("") + `<div class="menu-sep"></div>` : "")
      + `<div class="menu-label">Audio Sync</div><button data-resync="1"><span class="chk"></span>Resync Now</button>`
      + (info.live || info.recording ? "" : ads.map(([v, l]) => `<button data-ad="${v}"><span class="chk">${v === (pl.ad || 0) ? ic("check") : ""}</span>Sound ${l}</button>`).join(""));
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
    const rs = $("#mAudio [data-resync]");
    if (rs) rs.onclick = () => {
      hideMenus();
      // Jumping to where it already is makes the browser line sound and picture up again, a converted stream gets restarted there
      if (pl.mode === "hls") startHls(pos());
      else if (pl.mode === "live") tune();
      else pl.v.currentTime = Math.max(0, pl.v.currentTime - 0.05);
      toast("Audio resynced");
    };
    $("#mAudio").querySelectorAll("[data-ad]").forEach((b) => (b.onclick = () => {
      hideMenus();
      const v = Number(b.dataset.ad);
      // Shifting the sound happens on the server, so a file playing directly switches to the converted stream for it
      if (info.stream && info.src) { toast("This source plays directly, try Resync Now instead", 4000); return; }
      pl.ad = v; buildMenus();
      startHls(pos());
      toast(v ? `Sound ${v < 0 ? "earlier" : "later"} by ${Math.abs(v)}s` : "Audio back in sync");
    }));
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
    const was = btn.hidden;
    btn.hidden = !inIntro;
    // On a tv the remote lands on Skip Intro as it appears, so OK skips it (like the app), unless a menu is open
    if (TV && was && inIntro && !$(".player .menu:not([hidden])")) btn.focus({ preventScroll: true });
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
    box.innerHTML = `<div class="un-thumb">${n.thumbnail ? `<img src="${img(n.thumbnail, 0, 480)}" alt="" data-fallback="hide">` : ""}${auto ? `<svg class="un-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" /></svg>` : ""}</div>
      <div class="un-body"><div class="lbl">Next episode${auto ? ` in <b id="unLeft">${left}</b>` : ""}</div><div class="nm">${esc(epLabel(n.season, n.episode))}${n.name ? "  " + esc(nice(n.name)) : ""}</div>
      <div class="actions"><button class="btn primary small" id="unPlay">${ic("play")} Play Now</button><button class="btn secondary small" id="unHide">${auto ? "Cancel" : "Hide"}</button></div></div>`;
    box.hidden = false;
    if (TV && !$(".player .menu:not([hidden])")) $("#unPlay").focus({ preventScroll: true });
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

  // A 30 second clip where a whole film or episode should be. TorBox hands one of these out (a green screen with a
  // message) when a download didnt really happen, so it gets spotted by its length, or by the picture being mostly
  // that green, and Kino offers the next source like the up next card. With the setting on it just moves on
  // TorBox has a second one now: about 2 minutes, black with text (Already downloading and a QR code). A real film or episode is never
  // that short, so that length plus a dark picture with text on it counts, and where the picture cant be read the length alone does
  const isFakeLen = (d) => d >= 27 && d <= 33;
  // Far shorter than the film or episode should be (the metadata says how long it is): a fake, a trailer or a clip that stands in for it
  const tooShort = (d) => { const e = pl.info && pl.info.expect; return !!(e && e >= 20 && d > 0 && d < e * 60 * 0.35); };
  const isLongFakeLen = (d) => d >= 100 && d <= 140;
  function darkTextFrame() {
    try {
      const c = darkTextFrame.c || (darkTextFrame.c = document.createElement("canvas"));
      c.width = 64; c.height = 36;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(pl.v, 0, 0, 64, 36);
      const d = x.getImageData(0, 0, 64, 36).data;
      let dark = 0, bright = 0;
      for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; if (l < 40) dark++; else if (l > 150) bright++; }
      const n = d.length / 4;
      return dark / n > 0.6 && bright / n > 0.012 && bright / n < 0.5;
    } catch (_) { return null; }  // a picture from another site cant be read
  }
  function greenFrame() {
    try {
      const c = greenFrame.c || (greenFrame.c = document.createElement("canvas"));
      c.width = 32; c.height = 18;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(pl.v, 0, 0, 32, 18);
      const d = x.getImageData(0, 0, 32, 18).data;
      let g = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 90 && d[i + 1] > d[i] * 1.6 && d[i + 1] > d[i + 2] * 1.6) g++;
      return g / (d.length / 4) > 0.55;
    } catch (_) { return false; }  // a picture from another site cant be read, the length check still works
  }
  function checkFake() {
    const info = pl.info;
    if (!info || pl.fakeAsked || !info.stream || (info.kind !== "movie" && info.kind !== "series")) return;
    const p = pos();
    let fake = isFakeLen(total()) || tooShort(total());
    if (!fake && p > 1.5 && p < 8 && !pl.v.paused && pl.mode === "direct" && !pl.greenChecked) { pl.greenChecked = true; fake = greenFrame() && (!total() || total() < 120); }
    // The text comes in a little after the start, so the picture gets looked at every couple of seconds for the first 40
    if (!fake && isLongFakeLen(total()) && p > 1.5 && p < 40 && !pl.v.paused && Date.now() - (pl.frameAt || 0) > 2000) {
      pl.frameAt = Date.now();
      const f = darkTextFrame();
      fake = f === null || f;
    }
    if (!fake) return;
    const dur = total(), mins = Math.max(1, Math.round(dur / 60)), short = dur < 45;
    const what = short ? "30 second" : `${mins} minute`;
    pl.fakeAsked = true;
    const fid = info.id, more = moreSources(fid), auto = info.prefs && info.prefs.auto_next_source;
    if (auto && more) { nextSource(fid, 0, `That copy was a ${what} placeholder`); return; }
    api(`/api/streams/${fid}/bad`, {}).catch(() => {});
    pl.v.pause();
    const box = $("#upNext");
    box.innerHTML = `<div class="un-body"><div class="lbl">Probably a placeholder or fake${more ? "" : ", and there's no other source"}</div><div class="nm">This Copy is Only ${short ? "30 Seconds" : `${mins} Minute${mins === 1 ? "" : "s"}`}</div>
      <div class="actions">${more ? `<button class="btn primary small" id="fkNext">Next Source</button>` : ""}<button class="btn secondary small" id="fkKeep">${more ? "Keep Watching" : "OK"}</button></div></div>`;
    box.hidden = false;
    if (more) $("#fkNext").onclick = () => { box.hidden = true; nextSource(fid, 0, "Skipped the placeholder"); };
    $("#fkKeep").onclick = () => { box.hidden = true; pl.v.play().catch(() => {}); };
    ($("#fkNext") || $("#fkKeep")).focus();
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
    checkFake();
  }
  v.addEventListener("timeupdate", drawTime);
  v.addEventListener("progress", drawTime);
  v.addEventListener("waiting", () => { if (!LOAD.on) spinner(true); if (!pl.bufStart) pl.bufStart = Date.now(); });
  v.addEventListener("playing", () => {
    // How long that stall was, the buffering watch below adds them up. Stalls right after a seek dont count
    if (pl.bufStart && pl.playedAt && Date.now() - (pl.lastSeek || 0) > 10000) pl.stalls.push([Date.now(), Date.now() - pl.bufStart]);
    pl.bufStart = 0;
  });
  // A source that keeps stopping to load: 12 seconds stuck in one go, or 25 seconds over two minutes. Asks to swap
  // to the next source like the placeholder card does, or just swaps with the setting on
  setInterval(() => {
    const info = pl.info;
    if (!info || pl.el.hidden || !info.stream) return;
    const now = Date.now();
    if (!pl.playedAt && pos() > 5 && !pl.v.paused) pl.playedAt = now;
    if (!pl.playedAt || now - pl.stallAskedAt < 180000 || now - (pl.lastSeek || 0) < 10000 || !moreSources(info.id)) return;
    pl.stalls = pl.stalls.filter((x) => now - x[0] < 120000);
    const cur = pl.bufStart && !pl.v.paused ? now - pl.bufStart : 0;
    if (cur < 12000 && pl.stalls.reduce((a, x) => a + x[1], 0) + cur < 25000) return;
    pl.stallAskedAt = now;
    const at = pos();
    if (info.prefs && info.prefs.auto_next_source) { nextSource(info.id, at, "That source kept buffering"); return; }
    const box = $("#upNext");
    box.innerHTML = `<div class="un-body"><div class="lbl">Another source might play smoother</div><div class="nm">This Source Keeps Buffering</div>
      <div class="actions"><button class="btn primary small" id="stNext">Next Source</button><button class="btn secondary small" id="stKeep">Keep Waiting</button></div></div>`;
    box.hidden = false;
    $("#stNext").onclick = () => { box.hidden = true; nextSource(info.id, pos(), "Switched sources"); };
    $("#stKeep").onclick = () => { box.hidden = true; pl.stalls = []; };
    $("#stNext").focus();
  }, 1000);
  v.addEventListener("playing", () => {
    spinner(false); $("#pMsg").hidden = true; loadHide(); stillReset();
    if (pl.info && (!pl.evStarted || pl.evPaused)) { pl.evStarted = true; pl.evPaused = false; sendEvent("start"); }
  });
  v.addEventListener("canplay", () => spinner(false));
  const playIcon = () => { $("#pPlay").innerHTML = ic(v.paused ? "play" : "pause"); $("#pPlay").setAttribute("aria-label", v.paused ? "Play" : "Pause"); };
  v.addEventListener("play", () => {
    playIcon();
    // Pressing play on a live channel after a while goes to what's on now instead of carrying on from where it stopped
    if (pl.info && pl.info.live && pl.mode === "live" && (pl.liveStale || Date.now() - (pl.pausedAt || Date.now()) > 20000)) {
      pl.liveStale = false; pl.liveRetries = 0;
      if (pl.hls) { pl.hls.loadSource(`/api/live/${pl.info.id}/index.m3u8`); pl.hls.startLoad(-1); }
      else { v.src = `/api/live/${pl.info.id}/index.m3u8`; v.play().catch(() => {}); }
    }
    // On a tv the focus has to stay on the controls, not drop to something else when the picture starts again
    if (TV && !pl.el.hidden && $("#pMsg").hidden) { const a = document.activeElement; if (!a || a === document.body || !pl.el.contains(a)) { const pp = $("#pPlay"); pp && pp.focus(); } }
  });
  if (ANDROID) {
    v.addEventListener("playing", () => window.KinoAndroid.setPlaying(true));
    ["pause", "ended", "emptied"].forEach((ev) => v.addEventListener(ev, () => window.KinoAndroid.setPlaying(false)));
  }
  v.addEventListener("pause", () => {
    pl.pausedAt = Date.now();
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
  $("#pBack").onclick = () => (pl.info && pl.info.live ? switchLive(-1) : seekTo(pos() - 10));
  $("#pFwd").onclick = () => (pl.info && pl.info.live ? switchLive(1) : seekTo(pos() + 10));
  $("#pClose").onclick = () => closePlayer();
  $("#plClose").innerHTML = ic("close");
  if (ANDROID && TV) $("#plClose").hidden = true;  // the remote has Back
  $("#plClose").onclick = () => closePlayer();
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
  // A touch while the controls are faded only wakes them, the pause comes from the next tap (wakeUi runs on pointerdown so this has to look first)
  pl.el.addEventListener("pointerdown", (e) => { pl.wakeTap = e.pointerType === "touch" && pl.el.classList.contains("idle"); }, true);
  pl.el.addEventListener("click", (e) => {
    if (!e.target.closest(".menu-wrap")) hideMenus();
    const woke = pl.wakeTap; pl.wakeTap = false;
    if (!woke && (e.target === v || e.target.id === "playerUi")) toggle();
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

  // Holding left or right on a tv remote speeds up the longer it is held (10s, then 30s, 60s and 2 minutes at a time), same as the app. A mouse or keyboard
  // keeps the plain 10 seconds
  const seekStep = (dir) => {
    if (!TV) return dir * 10;
    const now = performance.now();
    pl.seekN = now - (pl.seekAt || 0) < 600 ? (pl.seekN || 0) + 1 : 0;
    pl.seekAt = now;
    return dir * 10 * (pl.seekN < 3 ? 1 : pl.seekN < 8 ? 3 : pl.seekN < 16 ? 6 : 12);
  };

  document.addEventListener("keydown", (e) => {
    if (pl.el.hidden || e.target.tagName === "INPUT" || sheetClose) return;
    // While the loading screen is up only Escape does anything, the shortcuts would act on controls that arent there yet
    if (LOAD.on && e.key !== "Escape") return;
    const onControl = TV && e.target.closest && e.target.closest(".player-row, .menu, .up-next, .player-top, .skip-intro");
    if ((e.key === " " || e.key === "k") && !onControl) { e.preventDefault(); toggle(); }
    else if (pl.info && pl.info.live && ["PageUp", "PageDown", "ChannelUp", "ChannelDown"].includes(e.key)) { e.preventDefault(); switchLive(e.key === "PageUp" || e.key === "ChannelUp" ? -1 : 1); }
    // Live tv: left and right flick between channels and they are the only keys that do, up and down used to change channel
    // when the buttons were hiden which kept happening by acident
    else if (pl.info && pl.info.live && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !onControl) { e.preventDefault(); switchLive(e.key === "ArrowLeft" ? -1 : 1); }
    else if (e.key === "ArrowLeft" && e.target !== scrub && !onControl) seekTo(pos() + seekStep(-1));
    else if (e.key === "ArrowRight" && e.target !== scrub && !onControl) seekTo(pos() + seekStep(1));
    else if (e.key === "j" && !(pl.info && pl.info.live)) seekTo(pos() - 10);
    else if (e.key === "l" && !(pl.info && pl.info.live)) seekTo(pos() + 10);
    else if (e.key === "c" && !$("#pSubs").hidden && $("#pSubs").offsetParent) $("#pSubs").click();
    else if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && total() && !(pl.info && pl.info.live)) seekTo(total() * Number(e.key) / 10);
    else if (e.key === "f") $("#pFull").click();
    else if (e.key === "m") $("#pMute").click();
    else if (e.key === "s" && !$("#skipIntro").hidden) $("#skipIntro").click();
    else if (e.key === "Escape" && !document.fullscreenElement) closePlayer();
  });
  window.addEventListener("pagehide", saveProgress);

  // ---------------------------------------------------------- android app and tv remotes
  // The android app adds KinoAndroid to the user agent and gives the page a small bridge. On tvs (KinoTV) the
  // remote's arrows move focus around the page like on apple tv, the browser itself cant do that
  let NAV_T = 0;
  function nav(e) {
    const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const d = dirs[e.key];
    if (!d || e.altKey || e.ctrlKey || e.metaKey) return;
    const cur = document.activeElement;
    if (cur && cur.matches("input[type=search], input[type=text], input:not([type])") && d[0] && cur.value) return;  // moving the text cursor
    if (cur && cur.id === "scrub" && d[0]) return;   // the timeline seeks with left and right
    const playerOpen = !pl.el.hidden;
    // Watching live tv with the buttons hidden: left and right change channel (the focus sits on a hidden button so the
    // remote used to move that instead and the screen just looked wierd), up and down only bring the buttons back
    if (playerOpen && d[0] && pl.info && pl.info.live && pl.el.classList.contains("idle") && !$(".player .menu:not([hidden])")) { e.preventDefault(); e.stopImmediatePropagation(); switchLive(d[0]); return; }
    if (playerOpen && (!cur || !pl.el.contains(cur) || cur === pl.v) && d[0]) return;  // left and right seek
    // Holding a button on a slow tv sends keys faster than it can work out where focus goes, so the extra ones are dropped
    if (e.repeat) {
      const now = performance.now();
      if (now - NAV_T < 80) { e.preventDefault(); return; }
      NAV_T = now;
    }
    // An open dropdown keeps the remote inside it until it's closed, otherwise down could land on the page behind it
    const openMenu = cur && cur.closest && cur.closest(".menu:not([hidden])");
    const scope = sheetClose ? $$(".sheet-wrap").pop() : EMB ? EMB.el : TRAILER_VIEW ? TRAILER_VIEW.el : openMenu || (playerOpen ? pl.el : document);
    if (playerOpen) wakeUi();
    const items = $$('a[href], button, input, select, summary, [tabindex]:not([tabindex="-1"])', scope).filter((el) => {
      // Things inside a closed section can't take focus, only the section's own toggle can
      if (el.closest("details:not([open])") && el.tagName !== "SUMMARY") return false;
      // The little See All links in row headers get skipped, rows end with a card that does the same and is easy to land on
      if (el.disabled || el.closest("[hidden]") || el.closest('[aria-hidden="true"]') || el.closest(".hero-dots") || el.closest(".section-title")) return false;
      const r = el.getBoundingClientRect();
      // Asking the style of every item was slow on tvs, visibility hidden only comes from the fading hero slides (skipped
      // above) and the live tv timeline, and display none already has no size
      return r.width > 2 && r.height > 2 && !el.closest(".player.live .tl-row");
    });
    if (!items.length) return;
    e.preventDefault();
    if (!cur || cur === document.body || !scope.contains(cur)) {
      const first = (playerOpen && $("#pPlay")) || $("[data-heroplay], [data-heroresume], .hero-slide.on .btn.primary, #pdPlay, #playMain", scope) || items.find((el) => !el.closest("#chrome")) || items[0];
      first.focus({ preventScroll: false });
      return;
    }
    // A favourite's star and dots sit on top of its picture so sideways keeps going tile to tile. Down from the tile steps
    // onto them (left and right swap between the two), up steps back to the tile, and down from them carries on below
    const fc = !openMenu && cur.closest && cur.closest(".fav-cell");
    if (fc) {
      const btns = $$(".fav-btn", fc), at = btns.indexOf(cur);
      // The star and dots are drawn on the top of the picture, so up from the card steps onto them and down from them is back on
      // the card. Down from the card leaves the row and up from the buttons does too, same as any other card
      if (at < 0 && cur.classList.contains("fav-tile") && d[1] < 0 && btns.length) return void btns[0].focus();
      if (at >= 0 && d[1] > 0) return void $(".fav-tile", fc).focus();
      if (at >= 0 && d[0]) {
        // Left and right swap between the star and the dots, past the end it carries on to the same button on the next card
        // so you stay on the buttons level, and at the very end of the row it stays put
        const to = at + d[0];
        if (to >= 0 && to < btns.length) return void btns[to].focus();
        const cells = $$(".fav-cell", fc.parentNode), nc = cells[cells.indexOf(fc) + d[0]];
        if (nc) { const nb = $$(".fav-btn", nc); (nb[d[0] > 0 ? 0 : nb.length - 1] || $(".fav-tile", nc)).focus(); }
        return;
      }
    }
    // Up and down from anywhere on a favourite measure from the whole card and never land on the favourites row its self,
    // the star sits on top of the picture so its own tile (and the tiles next to it) were counted as "below" the star,
    // thats why down from the star hit the tile and then down again jumped back up to the star
    const a = (fc || cur).getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    // The sidebar is its own column: up and down stay inside it, and things tucked behind it aren't targets
    const side = $("#side"), inSide = !!(side && side.contains(cur));
    const sideRight = side && !playerOpen && !sheetClose ? side.getBoundingClientRect().right : -1;
    // Right at the end of a row stays put instead of jumping up into whatever row is above
    const curRow = d[0] > 0 && cur.closest && cur.closest(".row, .episodes, .chips");
    // Two steps like a tv's own focus engine: first the nearest line of things in that direction, then on that line the
    // one closest to where you are. Measured edge to edge, so a tall card further away never beats a button right next to you
    // Sideways along a row of cards only ever lands on another card, the little buttons under episodes (mark as
    // watched) used to catch the remote at the end of a season so it looked like the selection got lost
    const tileRow = d[0] && cur.classList && cur.classList.contains("tile") && cur.closest(".row, .episodes");
    const rowTiles = tileRow ? items.filter((el) => el !== cur && el.classList.contains("tile") && tileRow.contains(el) && (el.getBoundingClientRect().left - a.left) * d[0] > 0) : [];
    const cands = [];
    for (const el of items) {
      if (el === cur) continue;
      if (fc && d[1] && el.closest(".fav-cell")) continue;
      if (!fc && el.classList.contains("fav-btn")) continue;
      if (fc && d[1] > 0 && el.classList.contains("ch-opt")) continue;  // land on the channel itself, not its little menu button
      if (curRow && !curRow.contains(el)) continue;
      if (rowTiles.length && !rowTiles.includes(el)) continue;
      if (tileRow && d[0] > 0 && !el.classList.contains("tile")) continue;
      const elSide = !!(side && side.contains(el));
      if (d[1] && elSide !== inSide) continue;
      // Right stays out of the sidebar's own items, but works inside its profile menu (the Appearance buttons)
      if (d[0] > 0 && inSide && elSide && !openMenu) continue;
      const b = el.getBoundingClientRect();
      if (!elSide && scope === document && b.left + b.width / 2 < sideRight) continue;
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      if (d[0] ? (bx - ax) * d[0] <= 4 : (by - ay) * d[1] <= 4) continue;
      // How far away the next line is, and how far along it
      const gap = d[1] > 0 ? b.top - a.bottom : d[1] < 0 ? a.top - b.bottom : d[0] > 0 ? b.left - a.right : a.left - b.right;
      const overlap = d[1] ? Math.min(a.right, b.right) - Math.max(a.left, b.left) : Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const along = d[1] ? Math.abs(bx - ax) : Math.abs(by - ay);
      cands.push({ el, gap: Math.max(-8, gap), overlap, along });
    }
    // Ranked best first, if the first one won't take focus the next one gets it, so the remote never gets stuck
    let ranked = [];
    if (cands.length) {
      if (d[1]) {
        const near = Math.min(...cands.map((c) => c.gap));
        const line = cands.filter((c) => c.gap <= near + 24);
        line.sort((x, y) => (y.overlap > 0) - (x.overlap > 0) || x.along - y.along);
        const rest = cands.filter((c) => !line.includes(c)).sort((x, y) => x.gap - y.gap || x.along - y.along);
        ranked = line.concat(rest).map((c) => c.el);
      } else {
        // Sideways prefers things on the same row, then the closest
        cands.sort((x, y) => (y.overlap > 0) - (x.overlap > 0) || (x.gap + x.along * 2) - (y.gap + y.along * 2));
        ranked = cands.map((c) => c.el);
      }
    }
    // Rows of cards (Home, search, a title's episodes) go by the order of the rows instead of measuring, the tv's zoom
    // made the measuring land on the wrong row now and then. It lands on the card in the next row nearest to you
    const rowOf = (el) => el.closest && el.closest(".shelf, .hist");
    const curShelf = d[1] && !inSide && scope === document && rowOf(cur);
    if (curShelf) {
      const shelves = $$(".shelf, .hist", app).filter((sh) => sh.getBoundingClientRect().height > 2 && $$("a[href], button", sh).some((x) => items.includes(x)));
      const i = shelves.indexOf(curShelf), nextShelf = shelves[i + d[1]];
      if (nextShelf) {
        const opts = items.filter((x) => nextShelf.contains(x));
        // History rows go play button to play button
        const same = cur.dataset && cur.dataset.hplay ? opts.filter((x) => x.dataset.hplay) : cur.dataset && cur.dataset.hdel ? opts.filter((x) => x.dataset.hdel) : opts.filter((x) => x.classList.contains("tile") || x.classList.contains("fresh-card"));
        const pool = same.length ? same : opts;
        pool.sort((x, y) => Math.abs(x.getBoundingClientRect().left + x.getBoundingClientRect().width / 2 - ax) - Math.abs(y.getBoundingClientRect().left + y.getBoundingClientRect().width / 2 - ax));
        if (pool.length) ranked = pool.concat(ranked.filter((x) => !pool.includes(x)));
      }
    }
    let best = null;
    for (const el of ranked) { el.focus({ preventScroll: true }); if (document.activeElement === el) { best = el; break; } }
    // Going into the sidebar lands on the page you're on, not whichever item happened to be level with you
    if (best && d[0] < 0 && !inSide && side && side.contains(best)) {
      const here = $(".side-item[aria-current='page']", side);
      if (here && here.getBoundingClientRect().height > 2) { best = here; here.focus({ preventScroll: true }); }
    }
    if (best) {
      // Anything in the big picture at the top of a page scrolls the page right back up, so the logo and art stay in
      // view instead of the button being put in the middle of the screen
      const top = !playerOpen && !sheetClose && best.closest(".detail-hero, .hero");
      if (top && d[1]) window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
      else best.scrollIntoView({ block: d[1] ? "center" : "nearest", inline: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
    }
  }
  if (TV) {
    document.body.classList.add("tv");
    // Focus scrolling keeps the selected thing 27px in from the top and bottom, a tv may crop the very edge of the picture
    document.documentElement.style.scrollPaddingBlock = "27px";
    document.addEventListener("keydown", nav, true);
  }
  // Back on a remote or phone closes whatever is on top first, the app goes back a page when this says no
  window.kinoBack = () => {
    if (closeEmbed()) return true;
    if (closePop()) return true;
    // An open dropdown on the page (the ... on a title) closes first and the remote goes back to its button
    const dd = $$(".menu.drop:not([hidden])", app)[0];
    if (dd) {
      dd.hidden = true;
      const wrap = dd.closest(".menu-wrap"), btn = wrap && $("button", wrap);
      const hero = dd.closest(".detail-hero"); if (hero) hero.classList.remove("menu-open");
      if (btn) { btn.setAttribute("aria-expanded", "false"); btn.focus(); }
      return true;
    }
    const menu = $$(".player .menu").find((m) => !m.hidden);
    if (menu) { hideMenus(); return true; }
    if (sheetClose) { closeSheet(); return true; }
    if (!$("#pStill").hidden) { $("#stillYes").click(); return true; }
    if (!pl.el.hidden) { closePlayer(); return true; }
    const am = $("#avatarMenu");
    if (am && !am.hidden) { am.hidden = true; $("#side").classList.remove("pinned"); $("#avatarBtn").focus(); return true; }
    const page = (location.hash || "#/home").split("?")[0].split("/")[1] || "home";
    if (page === "title" || page === "discover" || page === "person") {
      let from = null;
      try { from = sessionStorage.getItem("kino-from"); } catch (_) {}
      const fresh = RELOADED || history.length <= 1;
      RELOADED = false;
      if (fresh) location.hash = from && from !== location.hash.split("?")[0] ? from : "#/home";
      else history.back();
      return true;
    }
    if (page !== "home" && page !== "profiles") { location.hash = "#/home"; return true; }
    if (TV && document.activeElement && !document.activeElement.closest("#chrome") && $("#side")) {
      // On a tv, back on Home jumps to the sidebar like apple tv, and from there it leaves
      const cur = $(".side-item[aria-current='page']") || $(".side-item");
      if (cur) { cur.focus(); return true; }
    }
    return false;
  };
  window.kinoMedia = (cmd) => {
    if (pl.el.hidden) {
      const f = document.activeElement && document.activeElement.form;
      if (cmd === "playpause" && f) f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event("submit", { cancelable: true }));
      return;
    }
    wakeUi();
    if (cmd === "playpause") toggle();
    else if (cmd === "play") pl.v.play().catch(() => {});
    else if (cmd === "pause") pl.v.pause();
    else if (cmd === "forward") pl.info && pl.info.live ? switchLive(1) : seekTo(pos() + 10);
    else if (cmd === "back") pl.info && pl.info.live ? switchLive(-1) : seekTo(pos() - 10);
    else if (cmd === "stop") closePlayer();
  };
  // ---------------------------------------------------------- app updates
  // When the app opens it checks if the server has a newer version, and offers to install it. Never while watching
  async function checkAppUpdate() {
    if (!ANDROID) return;
    let r;
    try { r = await (await fetch("/app/version", { credentials: "same-origin" })).json(); } catch (_) { return; }
    const mine = window.KinoAndroid.versionCode ? window.KinoAndroid.versionCode() : 0;
    if (!r.code || r.code <= mine) return;
    try { if (localStorage.getItem("kino-update-later") === String(r.code) && Date.now() - Number(localStorage.getItem("kino-update-at") || 0) < 86400000) return; } catch (_) {}
    const wait = () => (!pl.el.hidden || sheetClose ? setTimeout(wait, 5000) : offer());
    const offer = () => {
      const can = typeof window.KinoAndroid.installUpdate === "function";
      const s = sheet(`<div class="sheet-icon">${ic("download")}</div><h2>Kino ${esc(r.name)} is Ready</h2>
        <p class="secondary">${can ? "There's a newer version of the app. It downloads in a few seconds, then Android asks you to install it." : `There's a newer version of the app. Open <b class="mono">${esc(location.host)}/app</b> in the Downloader app to install it, after that updates install from here.`}</p>
        <div class="upd-bar" hidden><i></i></div><div class="form-err" id="updErr" role="alert"></div>
        <div class="actions end"><button class="btn secondary small" data-close id="updLater">Later</button>${can ? `<button class="btn primary small" id="updGo">Update Now</button>` : ""}</div>`);
      $("#updLater", s.el).addEventListener("click", () => { try { localStorage.setItem("kino-update-later", String(r.code)); localStorage.setItem("kino-update-at", String(Date.now())); } catch (_) {} });
      const go = $("#updGo", s.el);
      if (!go) return;
      window.kinoUpdate = (u) => {
        const bar = $(".upd-bar", s.el), err = $("#updErr", s.el);
        if (!bar) return;
        if (u.state === "downloading") { bar.hidden = false; $("i", bar).style.width = (u.progress < 0 ? 50 : u.progress) + "%"; go.textContent = u.progress < 0 ? "Downloading…" : `Downloading ${u.progress}%`; }
        else if (u.state === "permission") { err.textContent = "Turn on \"Allow from this source\" for Kino, then come back here."; go.disabled = false; go.textContent = "Update Now"; }
        else if (u.state === "denied") { err.textContent = "Kino isn't allowed to install updates yet. Turn it on in the settings that opened, then try again."; go.disabled = false; go.textContent = "Try Again"; }
        else if (u.state === "installing") { go.textContent = "Installing…"; }
        else if (u.state === "error") { err.textContent = u.message || "The update didn't download, try again."; go.disabled = false; go.textContent = "Try Again"; }
      };
      go.onclick = () => { go.disabled = true; go.textContent = "Starting…"; $("#updErr", s.el).textContent = ""; window.KinoAndroid.installUpdate(r.url || "/app"); };
    };
    wait();
  }
  if (ANDROID) setTimeout(checkAppUpdate, 4000);

  window.kinoPip = (on) => document.body.classList.toggle("pip", !!on);

  // ---------------------------------------------------------- picture recycling on tvs
  // A fire tv keeps every picture it has shown decoded in memory, and a page with a few hundred posters runs it out
  // of memory and the page crashes. Pictures more than about a screen away get swapped for an empty one and come
  // back when you get close again, so only what's around the screen is ever held. Computers and phones skip this
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  let RECYCLE_T = null;
  let RECYCLE_TIGHT = false;
  function recycle() {
    if (!LITE && !RECYCLE_TIGHT) return;
    const vw = innerWidth * (RECYCLE_TIGHT ? 0.2 : 1), vh = innerHeight * (RECYCLE_TIGHT ? 0.2 : 1);
    for (const im of app.getElementsByTagName("img")) {
      const r = im.getBoundingClientRect();
      const far = r.bottom < -vh * 1.2 || r.top > vh * 2.2 || r.right < -vw * 0.8 || r.left > vw * 1.8;
      if (far && !im.dataset.parked && im.complete && im.getAttribute("src") && !im.getAttribute("src").startsWith("data:")) {
        im.dataset.parked = im.getAttribute("src");
        im.src = BLANK;
      } else if (!far && im.dataset.parked) {
        im.src = im.dataset.parked;
        delete im.dataset.parked;
      }
    }
  }
  const recycleSoon = () => { clearTimeout(RECYCLE_T); RECYCLE_T = setTimeout(recycle, 250); };
  if (LITE) {
    document.addEventListener("scroll", recycleSoon, { capture: true, passive: true });
    document.addEventListener("focusin", recycleSoon);
    setInterval(() => { if (document.hidden || !pl.el.hidden) return; recycle(); }, 4000);
  }

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

  // ---------------------------------------------------------- dropdowns on tvs
  // The fire tv's own dropdown list is plain grey and sits wherever it wants, so on a tv each dropdown becomes a
  // button that opens a Kino picker. The real select stays hidden underneath, so the page code works the same
  function tvSelects(root = app) {
    if (!TV) return;
    $$("select", root).forEach((sel) => {
      if (sel.dataset.tv) return;
      sel.dataset.tv = "1";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tv-select";
      btn.id = sel.id ? sel.id + "Btn" : "";
      const title = sel.getAttribute("aria-label") || (sel.closest("label") && $(".sr", sel.closest("label")) ? $(".sr", sel.closest("label")).textContent : "") || (sel.closest(".set-row") && $("b", sel.closest(".set-row")) ? $("b", sel.closest(".set-row")).textContent : "") || "Choose";
      const draw = () => { const o = sel.options[sel.selectedIndex]; btn.innerHTML = `<span>${esc(o ? o.text : "")}</span>${ic("chevron")}`; btn.setAttribute("aria-label", `${title}: ${o ? o.text : ""}`); };
      draw();
      sel.addEventListener("change", draw);
      sel.style.display = "none";
      sel.after(btn);
      btn.onclick = (e) => {
        e.preventDefault();
        const cur = sel.selectedIndex;
        const s = sheet(`<h2 class="pick-title">${esc(title)}</h2><div class="pick-list" role="listbox" aria-label="${esc(title)}">${[...sel.options].map((o, i) =>
          `<button class="pick-opt ${i === cur ? "on" : ""}" role="option" aria-selected="${i === cur}" data-i="${i}"><span class="pick-ck">${i === cur ? ic("check") : ""}</span><span>${esc(o.text)}</span></button>`).join("")}</div>`, { stack: !!btn.closest(".sheet-wrap") });
        s.el.classList.add("picker");
        $$(".pick-opt", s.el).forEach((b) => (b.onclick = () => {
          const i = Number(b.dataset.i);
          s.close();
          if (i !== cur) {
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event("input", { bubbles: true }));
            sel.dispatchEvent(new Event("change", { bubbles: true }));
          }
          draw();
          btn.focus();
        }));
        // Starts on whatever is picked now, like apple tv
        setTimeout(() => { const on = $(".pick-opt.on", s.el) || $(".pick-opt", s.el); if (on) { on.focus({ preventScroll: true }); on.scrollIntoView({ block: "center" }); } }, 60);
      };
    });
  }

  if (TV) {
    // Parts of pages that load later (the admin bits of Settings, sheets) get there dropdowns swapped too
    let selT = null;
    new MutationObserver(() => { clearTimeout(selT); selT = setTimeout(() => tvSelects(document.body), 60); }).observe(document.body, { childList: true, subtree: true });
  }

  // ---------------------------------------------------------- router
  const applyPrefs = () => document.body.classList.toggle("blur-watched", !!(ME.profile && ME.profile.prefs && ME.profile.prefs.blur_watched));

  // Which sidebar item a page belongs to
  const sideFor = (page) => ({ title: "", discover: "", person: "search" })[page] ?? (page || "home");
  let LAST_PAGE = null, ROUTE_N = 0, ENTER_T = null, AUTO_FOCUS = null;

  // Apple style placeholders that show the shape of the page while it loads
  function skeleton(page) {
    const tiles = (n, cls = "sk-poster") => Array.from({ length: n }, () => `<div class="sk ${cls}"></div>`).join("");
    const row = (cls, n) => `<section class="shelf"><div class="sk sk-line" style="width:180px"></div><div class="row posters">${tiles(n, cls)}</div></section>`;
    if (page === "home" || !page) return `<div class="sk sk-hero"></div><main class="page under-hero">${row("sk-wide", 4)}${row("sk-poster", 7)}</main>`;
    if (page === "title" || page === "discover") return `<div class="sk sk-hero short"></div><main class="page under-hero">${row("sk-wide", 4)}</main>`;
    if (page === "settings" || page === "history" || page === "sync" || page === "server") return `<main class="page narrow"><div class="sk sk-title"></div><div class="sk sk-card"></div><div class="sk sk-card"></div></main>`;
    if (page === "search") return `<main class="page"><div class="sk sk-search"></div><div class="sk sk-line" style="width:200px;margin-top:32px"></div><div class="grid">${tiles(12)}</div></main>`;
    return `<main class="page"><div class="sk sk-title"></div><div class="grid">${tiles(14)}</div></main>`;
  }

  // Coming back from the player the page refreshes in place: same scroll, same focus, the old page held at its height
  // while the new one draws, so resume bars update without the page jumping or flashing
  let SOFT = false;
  async function softRoute() {
    const y = scrollY, k = focusKey(document.activeElement), h = app.offsetHeight;
    SOFT = true;
    app.style.minHeight = h + "px";
    try { await route(); } finally { SOFT = false; }
    window.scrollTo(0, y);
    requestAnimationFrame(() => { app.style.minHeight = ""; refocus(k); if (LITE) recycle(); });
  }

  async function route() {
    stopPoll();
    clearInterval(HERO_T);
    clearTimeout(SCAN_T);
    stopFavRow();
    closeSheet();
    stopPreviews(); closeTrailer();
    const [, page, arg] = (location.hash || "#/").split("?")[0].split("/");
    const n = ++ROUTE_N;
    const changed = (location.hash.split("?")[0]) !== LAST_PAGE;
    // Remembers where a title page was opened from. The app reloads the page after the player on low memory tvs,
    // which wipes the back history, and back then went to Home instead of where you were
    if (changed && LAST_PAGE && ["title", "discover", "person"].includes(page)) { try { sessionStorage.setItem("kino-from", LAST_PAGE); } catch (_) {} }
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
      // Which sections the sidebar has (Live TV, Videos), asked once and again after the admin changes addons or playlists
      if (!ME.features) ME.features = await api("/api/features").catch(() => ({}));
      // The sidebar stays and the page swaps to a skeleton straight away, so nothing jumps while it loads
      topbar(sideFor(page));
      document.body.classList.add("with-side");
      if (changed) { app.innerHTML = skeleton(page); app.classList.remove("enter"); window.scrollTo(0, 0); }
      if (page === "movies") await pageBrowse("movie");
      else if (page === "shows") await pageBrowse("series");
      else if (page === "live") await pageLive(arg || "");
      else if (page === "title" && arg) await pageTitle(arg);
      else if (page === "discover" && arg) await pageDiscover(safeDecode(arg), safeDecode(location.hash.split("?")[0].split("/")[3] || ""));
      else if (page === "search") await pageSearch();
      else if (page === "person" && arg) await pagePerson(safeDecode(arg));
      else if (page === "mylist") await pageMyList();
      else if (page === "settings") await pageSettings();
      else if (page === "history") await pageHistory();
      else if (page === "sync" && isAdmin()) await pageSync();
      else if (page === "server" && isAdmin()) await pageServer();
      else await pageHome();
      if (isAdmin() && page !== "sync" && page !== "home") api("/api/admin/sync").then((s) => { SYNC = s; updateSyncChip(); }).catch(() => {});
      if (n === ROUTE_N) { enhanceRows(app); tvSelects(app); }
      if (changed && n === ROUTE_N) {
        // Tells screen readers which page opened, the page itself no longer announces everything that changes in it
        const say = $("#routeSay"), h1 = $(".large-title, .hero-name", app);
        if (say) say.textContent = page === "home" || !page ? "Home" : h1 ? h1.textContent : "";
        void app.offsetWidth; app.classList.add("enter");
        // Only the first draw of a page animates, pages that refresh themselves every few seconds stay still
        clearTimeout(ENTER_T); ENTER_T = setTimeout(() => app.classList.remove("enter"), 900);
        // On a tv the remote lands on the page's main button after picking something in the sidebar
        if (TV) {
          // Goes through these in order, so a title page always starts on Play even if something else comes first on the page
          const el = [".hero-slide.on [data-heroresume]", ".hero-slide.on [data-heroplay]", "#playMain", "#pdPlay", "#vPlay", "#pdBox #listBtn", "#sq", ".tile", "main button", "main a[href]"]
            .map((q) => $(q, app)).find(Boolean);
          if (el) el.focus({ preventScroll: true });
          AUTO_FOCUS = el || null;
          const side = $("#side"); if (side) side.classList.remove("open");
        }
      }
      LAST_PAGE = location.hash.split("?")[0];
    } catch (e) {
      if (e.message === "pick profile" || n !== ROUTE_N) return;
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
