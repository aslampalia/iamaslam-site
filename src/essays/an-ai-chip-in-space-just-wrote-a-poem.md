---
title: "An AI Chip in Space Just Wrote a Poem"
desc: "Google's Project Suncatcher put an AI chip in orbit, powered only by sunlight. It answered its first question with a poem. Here is how it works, step by step, and why the real story is electricity."
cat: "Artificial Intelligence"
date: 2026-10-31
---

On October 30, 2026, engineers at Google sent a question up to a satellite. The answer came back as a small poem:

"Blue marble below. Data streams in silent grace. Starlight feeds my core."

It is a simple poem. But it is the first answer ever given by a data center class AI chip working in orbit. The project is called Project Suncatcher, and it is Google's plan to one day run AI computers in space, powered by sunlight. This essay explains what Google did, how the whole thing works step by step, and why the honest answer is both exciting and very far away.

## What Google actually did

On October 1, 2026, a SpaceX Falcon 9 rocket carried Google's prototype satellite into orbit from California. The satellite is about the size of a fridge. It was built with Planet, a company that already runs many Earth imaging satellites.

Inside the satellite sit four of Google's own AI chips, called Trillium TPUs. A TPU is the chip Google uses in its data centers to run AI. Solar panels on the satellite make up to 1 kilowatt of power. That is roughly the power of one microwave oven. It is very small by data center standards.

On October 30, after weeks of checks, the satellite answered its first real question from space, and Google's CEO, Sundar Pichai, called it a "hello world" moment for the project. Google says the satellite is working normally. To understand why this small event matters, it helps to walk through how the machine actually works, from the rocket ride to the poem.

## How it works, step by step

**Step 1: Survive the ride up.** A rocket launch is violent. The spacecraft is shaken hard and feels forces up to ten times gravity, and small parts inside can feel fifty to one hundred times gravity. Before the launch, Google shook the satellite on the ground in every direction to prove nothing would break loose. The chips passed.

**Step 2: Park where the sun never sets.** The satellite flies in a special path called a dawn to dusk orbit, about 650 kilometers above Earth. As Earth turns below it, the satellite stays on the line between day and night, so its solar panels sit in sunlight almost all the time. This one choice shapes everything else about the design.

**Step 3: Wake up slowly.** Reaching orbit is not the same as being ready. For about three weeks, engineers on the ground turned the satellite's systems on one by one. They powered up the main computer, then the chip trays, then ran small test jobs on the AI model. Only when every check passed did they send the first real question.

**Step 4: A question goes up.** The satellite does not listen all the time. It can only talk to Earth when it passes over a ground station. During one of those passes, over Svalbard in Norway, the team sent their prompt up: write a haiku about being in space. The AI model, a version of Google's Gemma 4, was already stored on the satellite, waiting.

**Step 5: The chip thinks on sunlight.** This is the heart of the whole project. The satellite has only one source of power: its solar panels. There is no fuel, no engine, no nuclear unit, and no wire back to Earth. Every bit of electricity the chip used to write that poem came from sunlight caught a moment earlier. Reporting on the mission notes that the always sunny orbit also removes the need for the heavy batteries most satellites carry, because the panels almost never go dark.

But sunlight alone is a tight budget. The panels make about 1 kilowatt, and the AI chip wants more than that while it is working. So the satellite runs only one of its four chips at a time, in short bursts of about 15 to 20 minutes, and then rests. Heat is the second reason for the rest. There is no air in space to carry heat away, so the chip warms up fast and can only cool down slowly through radiator panels. Short bursts are how a solar powered computer survives its own thinking.

**Step 6: The answer comes down.** When the work is done, the satellite sends the result back to a ground station on its next pass. That is how the poem reached Earth. The team also asked the satellite questions about itself, and it reported back on the conditions around it in orbit. The mission is planned to run for about a year, mostly to watch how the chips handle heat and radiation over time.

So the full loop is simple to say and hard to do: catch sunlight, turn it into electricity, spend that electricity on a few minutes of thinking, send the answer home, and rest.

## The big plan

One small satellite is not the goal. The goal is a group of satellites that work together as one big computer.

Google's design paper describes 81 satellites flying in formation, only 100 to 200 meters apart, about 650 kilometers above Earth. They would talk to each other with laser beams instead of cables. On the ground, Google has already tested one of these laser links at 800 gigabits per second in each direction. The full goal is tens of terabits per second, fast enough for the satellites to share one AI job between them.

The next step is already planned. In early 2027, Google and Planet will launch two more satellites. Their job is to prove that two machines in space can share AI work over a laser link. That test matters more than the poem.

## Why space? One word: electricity

AI runs on power, and power is becoming the hardest part of the whole industry. On Earth, new data centers need land, water for cooling, and a place in line for the electricity grid. In many places, that line is years long.

Space offers one clean answer. In the right orbit, a satellite sits in sunlight almost all the time. Google says solar panels in that orbit can make up to eight times more power than the same panels on Earth, and they work nearly nonstop. That means less need for heavy batteries.

Travis Beals, the man who leads Project Suncatcher, puts the idea in one line: "The sun puts out almost all of the power in our solar system." This project is Google's attempt to go straight to that source.

## The three hard problems

**Heat.** Space has no air. On Earth, a hot chip is cooled by fans and water. In space, heat can only leave through radiator panels, and those panels are heavy. This is the main reason the satellite today can only work in short bursts. Cooling, not computing, is the binding limit.

**Radiation.** Space is full of radiation that can damage normal computer chips. Before the launch, Google tested its Trillium chip in a proton beam at UC Davis. The chip's memory started to show problems only after a radiation dose nearly three times higher than what a five year mission is expected to receive, and the chip had no hard failure even at the highest dose tested. Now the team is watching how the real chips age in real orbit.

**Money.** This is the biggest problem of all. Today, sending one kilogram to orbit costs about $3,600. Google's own math says space data centers only start to make economic sense if that price falls below about $200 per kilogram. Google projects that could happen by the mid 2030s, if rocket prices keep falling the way they have. One peer reviewed analysis estimated SpaceX would need around 1,800 Starship flights to push costs down that path. James Manyika, a senior leader at Google, has said openly that the project will not be usefully operational for several years.

## Google is not alone in this race

A small startup called Starcloud, backed by Nvidia, flew an Nvidia H100 chip to space in November 2025. It trained a small AI model in orbit, a first, and ran Google's own Gemma model up there too. SpaceX has said it expects orbital AI compute satellites as early as 2028. So this is a real race. But everyone in it is at the first step.

## My view

The poem is a nice headline. The real story is power.

The richest technology companies on Earth are running out of easy electricity. One of them is now testing computers in orbit because of it. That single fact tells you how serious the power problem has become on the ground.

But the dates in this story tell the other half. The next real test is 2027. The economics, by Google's own numbers, belong to the mid 2030s. And the machine that wrote the poem is humble: 1 kilowatt of sunshine, one chip at a time, 20 minutes at a time. The biggest data centers on Earth use roughly a million times more power than that.

So space does not solve any power problem this decade. Project Suncatcher is a bet. The bet is that rockets become cheap enough, and lasers and radiators become good enough, that one day it is cheaper to catch sunlight in orbit than to fight for electricity on Earth. Google may win that bet. It is simply a bet about the 2030s, not a fix for today.

Two things would change my reading. First, if the two satellites in 2027 really do share one AI job over a laser link, the "one computer in the sky" idea stops being a drawing. Second, if launch prices fall on the schedule Google assumes, the money argument gets real. Until then, the poem stands as what it is: a small, genuine first step, and a very clear signal of how hungry AI has become.

---

*Sources: Google's Project Suncatcher announcements and research paper (October 2026), TechCrunch (October 30, 2026), NPR (October 1, 2026), GCN. Numbers are reported figures from those sources; the views in the final section are my own.*
