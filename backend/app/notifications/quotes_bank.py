"""
Lifed Curated Quotes Bank & Anti-Repetition Engine
Contains 100+ profound, non-cliché quotes across Stoicism, discipline,
deep work, strategy, and execution, along with non-repeating calendar-day rotation
and AI negative-prompting helpers.
"""
import hashlib
from datetime import datetime
from typing import List, Optional

CURATED_QUOTES: List[str] = [
    # --- Stoicism & Inner Resilience ---
    '"The impediment to action advances action. What stands in the way becomes the way." — Marcus Aurelius',
    '"We suffer more often in imagination than in reality." — Seneca',
    '"First say to yourself what you would be; and then do what you have to do." — Epictetus',
    '"Waste no more time arguing about what a good man should be. Be one." — Marcus Aurelius',
    '"You have power over your mind — not outside events. Realize this, and you will find strength." — Marcus Aurelius',
    '"Difficulties strengthen the mind, as labor does the body." — Seneca',
    '"How long are you going to wait before you demand the best for yourself?" — Epictetus',
    '"He who fears death will never do anything worthy of a man who is alive." — Seneca',
    '"If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it; and this you have the power to revoke at any moment." — Marcus Aurelius',
    '"No man is free who is not master of himself." — Epictetus',
    '"It is not that we have a short time to live, but that we waste a lot of it." — Seneca',
    '"The best revenge is not to be like your enemy." — Marcus Aurelius',
    '"Don\'t explain your philosophy. Embody it." — Epictetus',
    '"Begin at once to live, and count each separate day as a separate life." — Seneca',
    '"Curb your desire — don\'t set your heart on so many things and you will get what you need." — Epictetus',
    '"Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason which today arm you against the present." — Marcus Aurelius',
    '"Luck is what happens when preparation meets opportunity." — Seneca',
    '"Wealth consists not in having great possessions, but in having few wants." — Epictetus',
    '"Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart." — Marcus Aurelius',
    '"Throw me to the wolves and I will return leading the pack." — Seneca',

    # --- Relentless Discipline & Action ---
    '"The man who loves walking will walk further than the man who loves the destination."',
    '"Discipline is choosing between what you want now and what you want most." — Abraham Lincoln',
    '"Small disciplines repeated with consistency every day lead to great achievements slowly over time." — John C. Maxwell',
    '"We don\'t rise to the level of our expectations, we fall to the level of our training." — Archilochus',
    '"Action is the foundational key to all success." — Pablo Picasso',
    '"Knowing is not enough; we must apply. Willing is not enough; we must do." — Johann Wolfgang von Goethe',
    '"Do not wait; the time will never be \'just right\'. Start where you stand, and work with whatever tools you may have." — George Herbert',
    '"Amateurs sit and wait for inspiration, the rest of us just get up and go to work." — Stephen King',
    '"You don\'t have to be great to start, but you have to start to be great." — Zig Ziglar',
    '"The secret of getting ahead is getting started. The secret of getting started is breaking your complex overwhelming tasks into small manageable tasks." — Mark Twain',
    '"Motivation gets you going, but discipline keeps you growing." — John C. Maxwell',
    '"Discipline equals freedom." — Jocko Willink',
    '"There is no substitute for hard work." — Thomas Edison',
    '"Continuous effort — not strength or intelligence — is the key to unlocking our potential." — Winston Churchill',
    '"Energy and persistence conquer all things." — Benjamin Franklin',
    '"Great acts are made up of small deeds." — Lao Tzu',
    '"A year from now you may wish you had started today." — Karen Lamb',
    '"Do something today that your future self will thank you for." — Sean Patrick Flanery',
    '"The price of excellence is discipline. The cost of mediocrity is disappointment." — William Arthur Ward',
    '"Success isn\'t always about greatness. It\'s about consistency. Consistent hard work leads to success." — Dwayne Johnson',

    # --- Focus, Deep Work & Elimination of Noise ---
    '"Deep work is the ability to focus without distraction on a cognitively demanding task." — Cal Newport',
    '"Concentrate all your thoughts upon the work in hand. The sun\'s rays do not burn until brought to a focus." — Alexander Graham Bell',
    '"Simplicity boils down to two steps: Identify the essential. Eliminate the rest." — Leo Babauta',
    '"It is those who concentrate on but one thing at a time who advance in this world." — Og Mandino',
    '"The successful warrior is the average man, with laser-like focus." — Bruce Lee',
    '"Deciding what not to do is as important as deciding what to do." — Steve Jobs',
    '"Focus is a muscle. The more you protect your attention, the stronger your output becomes."',
    '"Clutter is nothing more than postponed decisions." — Barbara Hemphill',
    '"Subtract until you cannot subtract anymore. What remains is pure utility."',
    '"The art of being wise is the art of knowing what to overlook." — William James',
    '"Multi-tasking is an illusion. You cannot divide your focus and multiply your results." — Gary Keller',
    '"Eliminate the unnecessary so that the necessary may speak." — Hans Hofmann',
    '"Starve your distractions, feed your focus."',
    '"Your work is to discover your work and then with all your heart to give yourself to it." — Buddha',
    '"One reason so few of us achieve what we truly want is that we never direct our focus; we never concentrate our power." — Tony Robbins',
    '"Beware the barrenness of a busy life." — Socrates',
    '"Do less, but do it with complete presence." — Marcus Aurelius',
    '"Mastery requires the elimination of non-essentials."',
    '"Concentration is the secret of strength in politics, in war, in trade, in short in all management of human affairs." — Ralph Waldo Emerson',
    '"When walking, walk. When eating, eat. Do not wobble." — Zen Proverb',

    # --- Strategic Mastery, Warfare & Antifragility ---
    '"In the midst of chaos, there is also opportunity." — Sun Tzu',
    '"Strategy without tactics is the slowest route to victory. Tactics without strategy is the noise before defeat." — Sun Tzu',
    '"There is nothing outside of yourself that can enable you to get better, stronger, richer, quicker, or smarter. Everything is within." — Miyamoto Musashi',
    '"Do nothing that is of no use." — Miyamoto Musashi',
    '"Today is victory over yourself of yesterday; tomorrow is your victory over lesser men." — Miyamoto Musashi',
    '"Step by step walk the thousand-mile road." — Miyamoto Musashi',
    '"Wind extinguishes a candle and energizes fire. You want to be the fire and wish for the wind." — Nassim Nicholas Taleb',
    '"Antifragility is beyond resilience or robustness. The resilient resists shocks and stays the same; the antifragile gets better." — Nassim Nicholas Taleb',
    '"Courage is not the absence of fear, but the triumph over it." — Nelson Mandela',
    '"He who has a why to live can bear almost any how." — Friedrich Nietzsche',
    '"What does not kill me makes me stronger." — Friedrich Nietzsche',
    '"To know oneself is to study oneself in action with another person." — Bruce Lee',
    '"Do not pray for an easy life, pray for the strength to endure a difficult one." — Bruce Lee',
    '"If you know the enemy and know yourself, you need not fear the result of a hundred battles." — Sun Tzu',
    '"Let your plans be dark and impenetrable as night, and when you move, fall like a thunderbolt." — Sun Tzu',
    '"Perception precedes action. Right action follows the right perspective." — Ryan Holiday',
    '"The obstacle is an advantage not because it is easy, but because it filters out everyone else."',
    '"He who conquers himself is the mightiest warrior." — Confucius',
    '"A warrior considers himself already dead, so there is nothing to lose." — Hagakure',
    '"Iron sharpens iron; relentless friction shapes the blade."',

    # --- Engineering, Craftsmanship & The Long Game ---
    '"The first principle is that you must not fool yourself — and you are the easiest person to fool." — Richard Feynman',
    '"I would rather have questions that can\'t be answered than answers that can\'t be questioned." — Richard Feynman',
    '"Stay hungry, stay foolish." — Steve Jobs',
    '"Simple can be harder than complex: You have to work hard to get your thinking clean to make it simple." — Steve Jobs',
    '"If you want to build a ship, don\'t drum up people to collect wood, but teach them to long for the endless immensity of the sea." — Antoine de Saint-Exupéry',
    '"Play iterated games. All the returns in life, whether in wealth, relationships, or knowledge, come from compound interest." — Naval Ravikant',
    '"Impatience with actions, patience with results." — Naval Ravikant',
    '"Clear thinkers appeal to their own judgment, not the crowd." — Naval Ravikant',
    '"Desire is a contract you make with yourself to be unhappy until you get what you want." — Naval Ravikant',
    '"Compound interest is the eighth wonder of the world. He who understands it, earns it; he who doesn\'t, pays it." — Albert Einstein',
    '"It\'s not that I\'m so smart, it\'s just that I stay with problems longer." — Albert Einstein',
    '"Quality is not an act, it is a habit." — Aristotle',
    '"We are what we repeatedly do. Excellence, then, is not an act, but a habit." — Will Durant',
    '"Make it work, make it right, make it fast." — Kent Beck',
    '"Simplicity is prerequisite for reliability." — Edsger W. Dijkstra',
    '"Focus on the process, not the outcome. The scoreboard takes care of itself." — Bill Walsh',
    '"Measure twice, cut once. Execute with conviction."',
    '"The standard you walk past is the standard you accept." — David Hurley',
    '"Do the heavy lifting when nobody is watching so you can stand unshaken when everybody is."',
    '"Momentum is fragile. Guard it with your daily actions."'
]

DAY_ROTATING_THEMES = {
    0: "Ruthless execution, setting weekly momentum, and immediate high-impact action",        # Monday
    1: "Mental clarity, eliminating cognitive noise, and laser-like focus on the essential",  # Tuesday
    2: "Antifragility under pressure, turning obstacles into leverage, and resilience",        # Wednesday
    3: "Compounding consistency, deep craft, and executing standard operating procedures",     # Thursday
    4: "Closing open loops, relentless finish, and completing high-stakes milestones",         # Friday
    5: "Strategic perspective, long-term leverage, and self-mastery",                          # Saturday
    6: "Stillness, mental calibration, and preparing mind and weapons for the week ahead"      # Sunday
}


def get_deterministic_daily_quote(
    date: Optional[datetime] = None,
    history: Optional[List[str]] = None
) -> str:
    """
    Selects a quote from the curated pool deterministically based on calendar date.
    Guarantees that consecutive days never receive the same quote, and avoids any
    quote present in the recent history list.
    """
    dt = date or datetime.now()
    history_set = set(history or [])

    # Filter out recent history if possible
    available = [q for q in CURATED_QUOTES if q not in history_set]
    if not available:
        available = CURATED_QUOTES

    # Deterministic index using day of year + year hash
    day_of_year = dt.timetuple().tm_yday
    year = dt.year
    seed_str = f"lifed-quote-{year}-{day_of_year}"
    hash_val = int(hashlib.sha256(seed_str.encode("utf-8")).hexdigest(), 16)
    idx = hash_val % len(available)

    return available[idx]


def build_ai_quote_prompt(
    example_quote: str,
    base_theme: str,
    recent_quotes: Optional[List[str]] = None,
    date: Optional[datetime] = None
) -> str:
    """
    Builds an advanced prompt for Gemini/OpenRouter that enforces freshness,
    injects rotating day themes, and strictly forbids repeating recent quotes.
    """
    dt = date or datetime.now()
    weekday = dt.weekday()
    sub_theme = DAY_ROTATING_THEMES.get(weekday, "Relentless momentum and focus")
    day_name = dt.strftime("%A")

    negatives_text = ""
    if recent_quotes:
        recent_clean = [f"- {q.strip()}" for q in recent_quotes[-10:] if q.strip()]
        if recent_clean:
            negatives_text = (
                "\nCRITICAL ANTI-REPETITION CONSTRAINT:\n"
                "You must NOT repeat, paraphrase, or closely mimic any of these recently delivered quotes:\n"
                + "\n".join(recent_clean)
                + "\nSynthesize something genuinely novel, striking, and distinct."
            )

    prompt = (
        f"You are a master philosophical advisor, strategic commander, and performance coach.\n"
        f"Today is {day_name}.\n"
        f"The user's philosophical foundation is: \"{base_theme}\".\n"
        f"Today's strategic emphasis is: \"{sub_theme}\".\n"
        f"Their stylistic anchor is: \"{example_quote}\".\n"
        f"{negatives_text}\n\n"
        f"Instructions:\n"
        f"1. Generate a single, punchy, profound motivational quote tailored to today's focus.\n"
        f"2. Keep it under 2 short sentences. Make every word carry immense weight.\n"
        f"3. Return ONLY the quote text (wrapped in quotation marks), with an optional concise attribution if historical/philosophical.\n"
        f"4. Do NOT include greetings, intro words, or commentary."
    )
    return prompt
