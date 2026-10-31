"""How likely a live channel is to be one people want, 0 to 100, from its name.

There is no free live ratings database to ask, so this is a ranked list of channels by how widely watched they are (UK, US and the
international news, sport, film and kids channels). A channel is matched by name, whatever the quality tags, country marks or +1 on the end.
Anything not on the list scores 0. The most watched channels in the app move these up further by themselves, and the admin can hide kinds
of channel in Settings.
"""
import re

# (score, phrases). A phrase starting with = has to be the whole name (short names that would match inside other names), any other phrase
# can be anywhere in the name as whole words
TIERS = [
    (100, ["bbc one", "bbc 1", "bbc two", "bbc 2", "=itv", "=itv1", "itv 1", "channel 4", "channel 5", "sky sports main event", "sky sports premier league",
           "sky sports f1", "sky sports formula 1", "sky f1", "formula 1", "sky news", "bbc news", "bbc news 24", "=espn", "=cnn", "fox news", "=nbc", "=cbs", "=abc",
           "=fox", "=hbo", "sky atlantic", "sky showcase", "sky max", "sky witness", "sky sports football", "sky sports", "tnt sports 1", "tnt sports",
           "bt sport 1", "espn 2", "=espn2", "=itv2", "itv 2"]),
    (95, ["sky sports cricket", "sky sports golf", "sky sports racing", "sky sports arena", "sky sports action", "sky sports mix", "sky sports news",
          "sky sports tennis", "tnt sports 2", "tnt sports 3", "tnt sports 4", "tnt sports ultimate", "bt sport 2", "bt sport 3", "bt sport extra", "sky cinema",
          "=itv3", "itv 3", "=itv4", "itv 4", "=itvbe", "bbc three", "bbc four", "=e4", "=film4", "=more4", "=dave", "discovery channel", "=discovery",
          "national geographic", "nat geo", "=history", "history channel", "=fs1", "fox sports 1", "nbc sports", "nfl network", "nba tv", "mlb network", "golf channel",
          "=showtime", "=amc", "=fx", "=tnt", "=tbs", "usa network", "comedy central", "=cnbc", "=msnbc", "sky documentaries", "sky nature", "sky crime",
          "sky comedy", "sky arts", "sky history", "sky kids", "sky cinema"]),
    (85, ["eurosport 1", "eurosport 2", "=eurosport", "premier sports", "=dazn", "dazn 1", "laliga", "la liga", "=cbbc", "=cbeebies", "=nickelodeon", "nick jr", "=nick",
          "disney channel", "disney junior", "disney xd", "cartoon network", "=boomerang", "=mtv", "=vh1", "paramount network", "=tlc", "=bravo", "=e!", "food network",
          "=hgtv", "travel channel", "animal planet", "investigation discovery", "=syfy", "=a&e", "=lifetime", "=hallmark", "the cw", "=cw", "=pbs", "bloomberg",
          "=euronews", "al jazeera english", "al jazeera", "france 24", "=dw", "dw news", "gb news", "=talktv", "talk tv", "=quest", "quest red", "=really", "=yesterday",
          "=drama", "=w", "=u w", "=alibi", "=gold", "=challenge", "=pick", "=5usa", "=5star", "=5action", "bbc alba", "=s4c", "bbc parliament", "bbc scotland",
          "itv wales", "=stv", "=utv", "rte one", "rte 1", "=rte2", "=cartoonito", "=pop", "tiny pop", "=kix", "sky mix", "sky comedy", "sky replay",
          "sky one", "sky living", "sky 1", "comedy central extra", "mtv base", "=paramount", "film 4", "e4 extra", "itv quiz", "=great", "great tv",
          "sony movies", "movies 24", "talking pictures tv", "true crime", "crime investigation", "bbc world news", "cnn international", "sky arts"]),
    (70, ["=bbc", "cnn international", "sky ", "=nick toons", "=nicktoons", "espn news", "espn u", "fox sports", "fox business", "fox soccer", "cbs sports",
          "big ten network", "sec network", "acc network", "nfl redzone", "red zone", "ufc", "wwe", "tennis channel", "motorsport", "motor trend", "racing",
          "premier league", "champions league", "europa league", "football", "soccer", "cricket", "rugby", "boxing", "golf", "formula e", "motogp", "darts", "snooker"]),
    (50, ["cinema", "movies", "movie", "film", "documentary", "kids", "cartoon", "comedy", "news", "sports", "sport", "music", "crime", "drama", "series"]),
]

NOISE = {"hd", "uhd", "fhd", "sd", "4k", "8k", "hevc", "h265", "h264", "hq", "fullhd", "hdtv", "1080p", "720p", "50fps", "backup", "alt"}
COUNTRY = {"uk", "us", "usa", "gb", "ca", "au", "nz", "ie", "de", "fr", "es", "it", "nl", "pl", "pt", "se", "no", "dk", "fi", "tr", "ar"}


def tokens(name):
    n = re.sub(r"\([^)]*\)|\[[^\]]*\]", " ", str(name).lower())
    toks = [t for t in re.findall(r"[a-z0-9!&+]+", n) if t not in NOISE]
    # +1 channels are the same channel an hour later
    if toks and toks[-1] in ("+1", "1h", "plus1"):
        toks = toks[:-1]
    return toks


def _clean(phrase):
    return " ".join(re.findall(r"[a-z0-9!&+]+", phrase.lower()))


# Longest phrases first so "sky sports formula 1" wins over "sky "
_EXACT, _CONTAINS = {}, []
for _score, _phrases in TIERS:
    for _p in _phrases:
        if _p.startswith("="):
            _EXACT.setdefault(_clean(_p[1:]), _score)
        else:
            _CONTAINS.append((len(_clean(_p)), _clean(_p), _score))
_CONTAINS.sort(key=lambda x: -x[0])
_CONTAINS = [(p, s) for _, p, s in _CONTAINS]


def popularity(name):
    toks = tokens(name)
    if not toks:
        return 0
    whole = {" ".join(toks)}
    if toks[0] in COUNTRY and len(toks) > 1:
        whole.add(" ".join(toks[1:]))
    if toks[-1] in COUNTRY and len(toks) > 1:
        whole.add(" ".join(toks[:-1]))
    best = max((_EXACT[w] for w in whole if w in _EXACT), default=0)
    text = " " + " ".join(toks) + " "
    for p, sc in _CONTAINS:
        if sc > best and " " + p + " " in text:
            best = sc
    # anything from Sky not named above is still a mainstream channel
    if best < 70 and toks[0] == "sky":
        best = 70
    return best
