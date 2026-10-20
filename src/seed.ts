import type { Note } from "./types";
const now = Date.now();
const make = (
  id: string,
  title: string,
  folder: string,
  content: string,
  tags: string[],
  starred = false,
): Note => ({
  id,
  title,
  folder,
  content,
  tags,
  starred,
  updatedAt: now,
  version: 0,
  deleted: false,
});
export const seed: Note[] = [
  make(
    "welcome",
    "A place for your thoughts",
    "Start here",
    `> Every great idea starts with a small thought. Give yours a place to grow.

Welcome to **Bedrock**, your little corner of the internet for thinking clearly. A home for half-formed ideas, unexpected connections, and things worth remembering.

## Make room for a little curiosity

You don’t need a perfect system. Start with a thought, follow a question, or save something that makes you pause. The connections will come.

- **Capture freely.** A fleeting thought is a good enough beginning.
- **Connect the dots.** Type \`[[\` to link one idea to another.
- **Find your own rhythm.** There’s no right way to build your vault.

## A few paths to explore

Your vault is a garden, not a filing cabinet. These notes are a few seeds to get you started.

[[The art of noticing]]
[[A second brain, a quieter mind]]
[[Things I want to learn]]

---

*Build something meaningful, one note at a time.*`,
    ["welcome", "getting-started"],
    true,
  ),
  make(
    "noticing",
    "The art of noticing",
    "Ideas",
    `Small observations are the beginning of interesting ideas.

## Pay attention to the ordinary

The light in a room. A sentence that stays with you. The way someone solves a small problem. Most things become interesting when you look closely enough.

> Attention is the beginning of connection.

## A practice for the week

- [ ] Take a walk without headphones
- [ ] Write down three things that surprised you
- [x] Make a place to keep your observations

Related: [[A place for your thoughts]] · [[Creative rituals]]`,
    ["creativity", "mindfulness"],
    true,
  ),
  make(
    "second-brain",
    "A second brain, a quieter mind",
    "Ideas",
    `You can’t think deeply when you’re trying to remember everything.

## A trusted place

Write it down. Let your mind do what it does best: connect, imagine, and question.

A useful system is one you return to. Keep the friction low and let your notes evolve with you.

## Three simple habits

1. Capture what resonates.
2. Connect it to something you already know.
3. Revisit it when you’re ready to make something.

See [[The art of noticing]] and [[Reading list]].`,
    ["thinking", "systems"],
    true,
  ),
  make(
    "learn",
    "Things I want to learn",
    "Personal",
    `A running list of things that spark a little curiosity.

## Follow the thread

- [ ] How to make a really good pour-over
- [ ] The basics of generative art
- [ ] Why some spaces feel so calming
- [ ] A little more about local plants
- [ ] How to bind a notebook by hand

## Notes to myself

Learning doesn’t always need an outcome. Sometimes being interested is enough.

Connected to [[The art of noticing]] and [[Creative rituals]].`,
    ["curiosity", "personal"],
  ),
  make(
    "rituals",
    "Creative rituals",
    "Ideas",
    `## Begin before you feel ready

Open a notebook. Make coffee. Put on the same record. A small ritual is an invitation to begin.

## My morning

- Ten minutes of reading
- One page of unfiltered thoughts
- One small thing made with care

Inspired by [[A second brain, a quieter mind]].`,
    ["creativity", "habits"],
  ),
  make(
    "reading",
    "Reading list",
    "Resources",
    `## On my nightstand

- **The Creative Act** — Rick Rubin
- **A Field Guide to Getting Lost** — Rebecca Solnit
- **The Art of Noticing** — Rob Walker

## A thought to keep

Read for the questions a book leaves you with.

Connections: [[The art of noticing]] · [[Things I want to learn]]`,
    ["books", "inspiration"],
  ),
  make(
    "project",
    "A small side project",
    "Projects",
    `## The idea

Make something useful, simple, and a little delightful.

## Next steps

- [x] Give the idea a name
- [ ] Sketch the smallest possible version
- [ ] Share it with a friend

## Inspiration

Start with [[Creative rituals]] and make room for [[Things I want to learn]].`,
    ["projects"],
  ),
];
