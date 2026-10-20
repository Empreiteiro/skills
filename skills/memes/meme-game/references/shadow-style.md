# The shadow style

A second language for the same series: **a silhouette against fog**, the way Limbo does it. No visible pixels, no
two colors and no lines — black mass and gray air. The world, the character, the enemies and the grammar of a level
stay exactly as in the pixel style; only the drawing changes. `pixel.py` does not draw this style: these are the
rules for building it, each one learned by getting it wrong.

It **contradicts the page's art**, which is flat with no midtones, and the contradiction is the point: the game's
world is murky, and at the end it washes into the white page — the only place where things become clear.

## The encounter, in this style

The character **crouches, picks the sheet up off the ground and stands up to look at it** — and that is when the
barcode appears. Discovering what something is lasts longer than bumping into what was already visible. At the
death, the sheet slips from the hand and goes back to the ground, whole, waiting for the next one.

**Size matters**: a bill drawn as a slab 700px tall is a monument, not paper. A sheet lying on the ground that the
character finds says the same thing, better.

## What builds the depth, in order

1. **The sky**: a gradient with a glow and vertical shafts of light, all blurred. Nothing in it has an edge.
2. **Three layers of terrain**, lighter the farther away — that is what distance does to contrast in the air. The
   back one is blurred; the front one, black and sharp.
3. **Grass** on the crest of the front layer. Without it the crest is a drawn curve, and a drawn curve looks like a
   chart, not like ground.
4. **Grain**, changing every frame. Without it the image looks like a vector.
5. **A vignette**, closing the corners.

The background is computed **once** — it does not change. Per frame, only the figure, the grain and the vignette.

## The figure

- **A limb is a tapered outline, not a thick stroke.** A stroke with a round cap has the same thickness from hip
  to foot, and no leg is like that: the result is a hose puppet, however right the proportions. Each limb gets
  **three widths** — wide thigh, narrow knee, thin ankle; the torso gets shoulder, waist and hip; the foot is a
  wedge, not a ball. At a bend, the outline's normal is the bisector of the two perpendiculars, lengthened by the
  inverse of the cosine of half the angle; without that the outline pinches exactly where the joint bends most.
- **The neck has to show.** With the shoulders too wide, or a round shoulder ellipse instead of a flattened one,
  head and torso become one blot — the neck is where the eye separates them.
- **The shoulders are wider than the head.** With a bigger head the whole silhouette becomes a tadpole: without
  shoulders, there is nowhere for the head to end.
- **The only holes in the silhouette are the eyes** — and the enemy's barcode, which is the same grammar. In
  silhouette a bill is a rectangle, and a rectangle is nothing; the barcode **cut out** in white is what says what
  it is.
- **A thin limb has no thigh.** Proportions can be right on paper and the silhouette still come out spindly: mass
  is what makes it read, not the measurement.
- **The shoulder of the visible arm sits in front of the torso.** In the middle of it, the whole arm disappears
  into the mass.
- **The head follows the torso halfway.** When the figure bends to pick something up, the neck compensates and it
  looks down; with the head tilted along with the torso, it becomes a four-legged animal.

## Walking and posing

- **Describe a pose by its endpoints, not its joints.** Where the foot lands, where the hand reaches — and inverse
  kinematics solves knee and elbow. Choosing joint angles and hoping the foot lands on the ground walks like
  someone skating.
- **During stance, the foot moves back exactly as much as the body moves forward.** It is an equality worth
  checking with arithmetic (stride × height == step / 2, in whatever units the gait uses). If the two numbers do not
  match, the foot slides, and no angle tweak fixes it.
- **A limb must add up to a little more than the gap it covers.** With the hip at 0.45 of the height and the leg
  also 0.45, inverse kinematics stretches both segments straight in every position, and the figure walks like a
  stick. A leg of 0.477 works: the standing leg stays almost straight, as a walking person's does, and the bounce of
  the hip opens the knee when both feet touch the ground. With too much slack (0.56) it walks crouched all the time.
- **Asking for an endpoint out of reach gives the same stick.** Sending the hand to the ground while the body is
  still standing, or spreading arms and legs too far in a startle, stretches the whole limb. The hand comes down
  **together** with the crouch, and startle poses stay within reach.
- **The knee bends forward and the elbow back.** In screen coordinates, with y pointing down, that is opposite
  bend directions for leg and arm. Swapped, the figure walks with its legs backwards — an error that shows in the
  video and not in the math.

## The frame

- **The sheet on the ground cannot be shorter than the grass.** A 27px sheet in 50px grass vanishes. A scene about
  finding a piece of paper needs the paper visible before it is found.
- **Grain must be coarse.** Fine grain is the worst case for H.264: every pixel changes every frame and there is
  nothing to predict. Grain at half resolution gave a 15.6 MB clip; at a third, 6.4 MB — and it looked more like
  film, which has grain, not static.
- **The figure's size is the framing.** In a 9:16 frame the scene is a narrow strip: a figure 290px tall is an ant
  in an empty sky. At 540px it takes 28% of the height, which is Limbo's own proportion.
