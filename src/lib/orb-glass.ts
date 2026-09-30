/**
 * The glass orb: a sphere of real material, lit in a small studio, drawn by the GPU.
 *
 * Two bubbles, one shader, each in every version it has had. The iridescent bubble is a soap
 * film, nothing inside it: the page shows through, and what you see is the film's own colour,
 * which runs with the film's thickness and flows. The soap bubble is the study's: the same film,
 * softer, with the studio's pale wall showing through it rather than the page, which is what
 * makes it read as a milky white ball with pastel on it. Black and violet glass were here and
 * were dropped (the owner's call, 2026-09-30).
 *
 * The studio is fixed: a softbox top left, a strip light on the right, a dim bounce behind, a
 * floor the colour of what the orb sits on. On a dark page the iridescent bubble is drawn the other
 * way round: no pale body, the page seen through the film, only the film's own colour and light over
 * it. The soap bubble stays one object on every page.
 * `tilt` turns the whole studio, so a pointer can
 * carry the lights with it. Everything here is data and text: the component (`OrbGlass`) owns
 * the canvas.
 */

/**
 * A material is a family and a version, and a version is never changed once it is on the page:
 * a change is the next number beside it, so every step stays there to be judged against the
 * others (the owner's rule). The number is the order it was made in, oldest first.
 */
export type OrbGlassFamily = "bubble" | "soap" | "scene";
export type OrbGlassMaterial =
    | "bubble1"
    | "bubble2"
    | "bubble3"
    | "bubble4"
    | "bubble5"
    | "soap1"
    | "soap2"
    | "soap3"
    | "soap4"
    | "soap5"
    | "scene1"
    | "scene2"
    | "scene3"
    | "scene4"
    | "scene5"
    | "scene6"
    | "scene7"
    | "scene8"
    | "scene9"
    | "scene10"
    | "scene11";

/** A scene material draws the whole tile (face, shadow, ball) rather than a bare ball; the tile round it is then nothing but a hairline. */
export const orbGlassIsScene = (material: OrbGlassMaterial): boolean => orbGlassFamily(material) === "scene";

export const orbGlassFamily = (material: OrbGlassMaterial): OrbGlassFamily => material.replace(/\d+$/, "") as OrbGlassFamily;

/** The shader's number for each version. Numbers are given once and never reused. */
export const ORB_GLASS_MATERIAL_INDEX: Record<OrbGlassMaterial, number> = {
    bubble3: 2,
    soap3: 3,
    soap1: 4,
    soap2: 5,
    bubble1: 6,
    bubble2: 7,
    soap4: 8,
    bubble4: 9,
    soap5: 12,
    bubble5: 13,
    scene1: 15,
    scene2: 16,
    scene3: 17,
    scene4: 18,
    scene5: 19,
    scene6: 20,
    scene7: 21,
    scene8: 22,
    scene9: 23,
    scene10: 24,
    scene11: 25,
};

/** Which materials move on their own (a film that flows), so a frame loop knows to keep going. Glass only moves with the lights. */
export const ORB_GLASS_FLOWS: Record<OrbGlassFamily, boolean> = { bubble: true, soap: true, scene: true };

/** A number a shader can take: the fraction of the canvas the sphere fills, leaving room for antialiasing. */
export const ORB_GLASS_FILL = 0.96;

export const ORB_GLASS_VERTEX = `#version 300 es
void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const ORB_GLASS_FRAGMENT = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 uRes;
uniform int uMat;        // ORB_GLASS_MATERIAL_INDEX; 0, 1, 10, 11 and 14 were black and violet glass and are not given again
uniform vec3 uFloor;     // the colour under and behind the orb, in linear light
uniform float uFloorMix; // how much of the studio's lower half that colour replaces
uniform vec2 uTilt;      // where the lights are pulled to, -1..1 each way
uniform float uTime;     // seconds, for the bubble's film
uniform float uFill;
uniform float uDark;     // 1 on a dark page: the iridescent bubble lets the page through instead of carrying a pale body; a scene's dark face

const float PI = 3.14159265;

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }

// A soft-edged rounded rectangle of light in direction ld, seen from inside the sphere.
vec3 panel(vec3 d, vec3 ld, vec2 hsz, float rad, float soft, vec3 col) {
    float along = dot(d, ld);
    if (along <= 0.03) return vec3(0.0);
    vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), ld));
    vec3 u = cross(ld, r);
    vec2 q = vec2(dot(d, r), dot(d, u)) / along;
    vec2 e = abs(q) - hsz + rad;
    float sd = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - rad;
    float k = 1.0 - smoothstep(-soft, soft, sd);
    k *= 1.0 - 0.35 * smoothstep(0.0, 1.0, length(q / (hsz + 0.3)));
    k *= 0.75 + 0.25 * smoothstep(-1.0, 1.0, q.x / max(hsz.x, 0.1));
    return col * k;
}

// The studio, turned by the tilt so the lights travel with the pointer.
vec3 env(vec3 d) {
    d = rotX(-uTilt.y * 0.45) * rotY(uTilt.x * 0.7) * d;
    vec3 c = mix(vec3(0.016, 0.017, 0.022), vec3(0.16, 0.165, 0.19), smoothstep(-0.3, 1.0, d.y));
    c = mix(c, uFloor, smoothstep(-0.02, -0.55, d.y) * uFloorMix);
    c += panel(d, normalize(vec3(-0.58, 0.72, 0.60)), vec2(0.66, 0.46), 0.22, 0.16, vec3(5.6, 5.4, 5.1));
    c += panel(d, normalize(vec3(0.94, 0.02, 0.34)), vec2(0.055, 1.0), 0.05, 0.035, vec3(2.4, 2.6, 3.1));
    c += panel(d, normalize(vec3(0.25, -0.35, -0.9)), vec2(0.9, 0.6), 0.35, 0.4, vec3(0.20, 0.22, 0.28));
    return c;
}

vec3 sunDir() { return rotY(-uTilt.x * 0.7) * rotX(uTilt.y * 0.45) * normalize(vec3(-0.38, 0.46, 0.8)); }

vec3 keyDir() { return rotY(-uTilt.x * 0.7) * rotX(uTilt.y * 0.45) * normalize(vec3(-0.58, 0.72, 0.60)); }

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
// The study's curve: straight to 0.8, then a soft shoulder, so a pale wall stays pale.
vec3 soft(vec3 x) { return mix(clamp(x, 0.0, 1.0), 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.25)), step(0.8, x)); }

// What a film of the given thickness (in 100 nm) sends back at this angle: three wavelengths interfering.
vec3 film(float cosT, float thick, float n, float sat) {
    float cosF = sqrt(1.0 - (1.0 - cosT * cosT) / (n * n));
    float path = 2.0 * n * thick * cosF;
    vec3 ph = path / vec3(6.5, 5.4, 4.5);
    vec3 s = 0.5 + 0.5 * cos(2.0 * PI * ph + PI);
    float l = dot(s, vec3(0.333));
    return clamp(l + (s - l) * sat, 0.0, 1.0);
}

float fresnel(float f0, float x) { return f0 + (1.0 - f0) * pow(x, 5.0); }

// Light laid over the page: alpha says how much page is hidden, and is raised to cover the light
// itself, since a canvas clamps colour to alpha on the copy. Colour comes back un-premultiplied.
vec4 over(vec3 col, float a) {
    a = clamp(max(a, max(col.r, max(col.g, col.b))), 0.0, 1.0);
    return vec4(col / max(a, 1e-4), a);
}

// A bubble as the dark icon: the tile seen through the film, a cool haze for a body, the film's
// reflections, a thin light rim, the softbox white. wash is the family's own colour over it.
// level is how much light the bubble carries: 1 for v4, lower for a darker icon (v5).
vec4 darkBubble(vec3 refl, vec3 back, vec3 wash, vec3 n, float x, float kdif, float sun, float F1, float level) {
    vec3 haze = (vec3(0.5, 0.62, 0.85) * (0.07 + 0.08 * smoothstep(-0.6, 0.8, n.y)) + wash * 0.08) * level;
    float rim = pow(x, 3.0 + 2.0 * (1.0 - level));
    vec3 col = refl * F1 * (1.4 + 0.8 * level) + back * (0.8 + 0.6 * level) + haze + vec3(0.62, 0.72, 0.95) * rim * 0.55 + wash * rim * 0.6 + vec3(sun);
    float a = clamp(0.1 + 0.12 * level + F1 * 1.5 + rim * 0.5 + 0.1 * kdif * level, 0.0, 1.0);
    return over(pow(soft(col), vec3(1.0 / 2.2)), a);
}


// ---------------------------------------------------------------------------------------------
// The scene: the study's ray tracer, ported. The whole tile is drawn here, not only the ball:
// an orthographic camera looks at a bubble in front of the tile's face; what shows through the
// film is that face, with the ball's shadow on it. Lights and film as the study had them (v5 of
// the still), with the film flowing in time and the lights following the pointer.
// ---------------------------------------------------------------------------------------------
uniform float uScene;    // 1 draws the tile scene instead of the bare ball

const float SCENE_SPAN = 1.62;   // half-width of the view in the ball's radii: the ball is 62 percent of the tile
const float SCENE_BD = 1.4;      // the face sits this far behind the ball's centre

// smoothstep that allows a > b, as the study's did
float sm(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }

// The study's film: no phase flip, thickness in nm.
vec3 filmS(float d, float c, float n) {
    float s = sqrt(1.0 - c * c) / n;
    float ct = sqrt(1.0 - s * s);
    float opd = 2.0 * n * d * ct;
    return 0.5 + 0.5 * cos(2.0 * PI * opd / vec3(650.0, 545.0, 460.0));
}
vec3 saturateS(vec3 c, float s) { float g = (c.r + c.g + c.b) / 3.0; return clamp(g + (c - g) * s, 0.0, 4.0); }

mat3 frameS(vec3 dir) { vec3 u = normalize(cross(dir, vec3(0.0, 1.0, 0.0))); return mat3(dir, u, cross(u, dir)); }
float boxS(vec3 d, mat3 F, float hw, float hh, float soft) {
    float f = dot(d, F[0]);
    if (f <= 0.0) return 0.0;
    float u = dot(d, F[1]) / f, v = dot(d, F[2]) / f;
    return sm(hw + soft, hw - soft, abs(u)) * sm(hh + soft, hh - soft, abs(v));
}
// The study's studio, turned by the tilt.
vec3 envS(vec3 d) {
    d = rotX(-uTilt.y * 0.45) * rotY(uTilt.x * 0.7) * d;
    float y = d.y;
    float b = y > 0.0 ? mix(0.3, 0.72, sm(0.0, 1.0, y)) : mix(0.3, 0.025, sm(0.0, 0.5, -y));
    vec3 c = vec3(b * 0.93, b * 0.9, b);
    c *= 1.0 - 0.94 * sm(0.1, 0.8, d.z);
    float k = boxS(d, frameS(normalize(vec3(-0.5, 0.55, 0.67))), 0.42, 0.3, 0.12) * 6.0;
    float s = boxS(d, frameS(normalize(vec3(0.78, 0.08, 0.62))), 0.05, 0.75, 0.03) * 3.2;
    float f = boxS(d, frameS(normalize(vec3(-0.6, -0.5, 0.62))), 0.35, 0.2, 0.2) * 0.5;
    return vec3(c.r + k + s + f * 1.1, c.g + k + s + f * 0.85, c.b + k * 1.02 + s * 1.05 + f * 0.7);
}
vec3 sunS() { return rotY(-uTilt.x * 0.7) * rotX(uTilt.y * 0.45) * normalize(vec3(-0.38, 0.46, 0.8)); }

// The tile's face at (x, y): white or dark, the ball's shadow, the glow the film throws.
vec3 faceS(float x, float y) {
    bool dark = uDark > 0.5;
    float c = dark ? mix(0.016, 0.009, sm(-2.0, 2.0, -y)) : 1.0;
    vec3 col = dark ? vec3(c * 0.985, c * 0.985, c) : vec3(1.0);
    float sd = length(vec2((x - 0.28) / 1.05, (y + 0.42)));
    float sh = sm(1.55, 0.45, sd);
    col *= 1.0 - (dark ? 0.1 : 0.32) * sh;
    float gd = length(vec2(x / 1.1, (y + 1.02) / 0.32));
    float g = sm(1.0, 0.0, gd);
    col = col * vec3(1.0, 1.0 - 0.1 * g, 1.0) + vec3(0.25, 0.35, 0.6) * g * (dark ? 0.0 : 0.9);
    return col;
}
// What a ray from o along d sees behind the ball: the face, or the studio past the tile's edge.
vec3 traceS(vec3 o, vec3 d) {
    if (d.z < -1e-4) {
        float t = (-SCENE_BD - o.z) / d.z;
        float x = o.x + d.x * t, y = o.y + d.y * t;
        if (abs(x) < SCENE_SPAN && abs(y) < SCENE_SPAN) return faceS(x, y);
    }
    return envS(d);
}
// The study's curve: straight to 0.8, then a soft shoulder.
vec3 softS(vec3 x) { return mix(clamp(x, 0.0, 1.0), 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.25)), step(0.8, x)); }

vec4 sceneShade(vec2 fc) {
    vec2 uv = (fc / uRes) * 2.0 - 1.0;
    float x = uv.x * SCENE_SPAN, y = uv.y * SCENE_SPAN;
    // the tile's rounded corners
    float rad = 0.225 * 2.0 * SCENE_SPAN;
    vec2 q = max(abs(vec2(x, y)) - (SCENE_SPAN - rad), 0.0);
    if (length(q) > rad) return vec4(0.0);
    bool dark = uDark > 0.5;
    float rr = x * x + y * y;
    if (rr >= 1.0) {
        vec3 col = faceS(x, y);
        // a white face is #fff: it skips the curve; only the ball goes through it
        return vec4(pow(dark ? softS(col) : clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
    }
    vec3 p = vec3(x, y, sqrt(1.0 - rr));
    vec3 d = vec3(0.0, 0.0, -1.0);
    float c = p.z;
    // scene9 is scene8 as a palantir: the film's bands turn about the centre and flow faster, and a
    // cloud inside, coloured by the film, drifts with them, so the ball is seen to move on its own.
    // scene10 is scene9 on light, and on dark the same with less colour: the cloud and the film's
    // reflections held back, the blue haze kept.
    // scene11 is scene10 with the film nearer the still's v5: thicker and more varied, so some green
    // and yellow return beside the blue and magenta, and the light through it only half neutral.
    bool palantir = uMat >= 23;
    bool richer = uMat == 25;
    float hold = (uMat >= 24 && uDark > 0.5) ? 0.45 : 1.0;
    vec2 sw = p.xy;
    if (palantir) {
        float ang = uTime * 0.25 + 1.2 * (1.0 - length(p.xy));
        sw = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xy;
    }
    float flow = palantir
        ? sw.y * 1.6 + uTime * 0.6 + 1.1 * sin(sw.x * 1.3 + 0.5 + uTime * 0.4) + 0.5 * sin((sw.x + sw.y) * 2.1 - uTime * 0.5)
        : p.y * 1.6 + uTime * 0.3 + 1.1 * sin(p.x * 1.3 + 0.5 + uTime * 0.17) + 0.5 * sin((p.x + p.y) * 2.1 - uTime * 0.23);
    // scene6 is scene1 with the film kept thin: 290 to 380 nm, where a film of this kind reflects
    // magenta, violet and blue and no green or yellow. Nothing else differs.
    // scene7 is scene6 with the film thicker toward the rim, by exactly what the grazing angle takes
    // off the light's path through it, so the colour stays magenta and blue all the way to the edge.
    bool thin = uMat >= 20;
    float cosF = sqrt(1.0 - (1.0 - c * c) / (1.33 * 1.33));
    float th = richer ? (360.0 + 90.0 * sin(flow)) / cosF : uMat >= 21 ? (335.0 + (palantir ? 45.0 : 25.0) * sin(flow)) / cosF : thin ? 335.0 + 25.0 * sin(flow) + 20.0 * (1.0 - c) : 420.0 + 220.0 * sin(flow) + 160.0 * (1.0 - c);
    // scene1 has the study's film; scene2 the same film in pastel: less saturated, a shade fainter.
    // scene3 drops the spectrum for a palette after the owner's reference: blue running to violet and
    // pink in broad washes over the ball, the rim white glass, more of the colour in the body.
    // scene4 is scene3 with the colour where the reference has it: the light coming through the ball is
    // tinted by the palette, as through coloured glass, and the wash in the body is twice as strong.
    // scene5 goes further: a deeper palette laid as the reference has it, blue at the top right running
    // to pink at the bottom left with the flow moving through it, and the light through the ball tinted hard.
    bool pastel = uMat == 16;
    bool palette = uMat >= 17 && uMat <= 19;
    bool tinted = uMat == 18 || uMat == 19;
    bool deep = uMat == 19;
    float ph = deep ? clamp(sm(0.7, -0.7, p.y * 0.8 - p.x * 0.5) + 0.25 * sin(flow), 0.0, 1.0) : 0.5 + 0.5 * sin(flow * 0.8 + 1.5 * (1.0 - c) - 0.6);
    vec3 pal = deep ? mix(vec3(0.35, 0.62, 1.0), vec3(0.88, 0.32, 0.86), ph) : mix(vec3(0.55, 0.75, 1.0), vec3(0.92, 0.55, 0.95), ph);
    vec3 f = palette ? pal : saturateS(filmS(th, c, 1.33), pastel ? 1.05 : 1.7);
    float amp = 0.06 + 0.94 * pow(1.0 - c, 2.4);
    vec3 R = (palette ? mix(pal, vec3(1.0), 0.45) * amp * 1.6 : f * amp * (pastel ? 1.5 : 1.8)) * mix(1.0, hold, 0.6);
    vec3 r = reflect(d, p);
    vec3 front = envS(r) * R;
    vec3 pb = vec3(p.x, p.y, -p.z);
    vec3 rb = reflect(d, -pb);
    vec3 fb = palette ? mix(pal, vec3(1.0), 0.6) : pastel ? saturateS(filmS(th + 60.0, c, 1.33), 0.7) : filmS(th + (thin ? 20.0 : 60.0), c, 1.33);
    vec3 back = envS(rb) * fb * amp * 1.2;
    vec3 behind = traceS(pb, d);
    vec3 T = (1.0 - R) * (1.0 - fb * amp * 1.2);
    float sun = pow(max(0.0, dot(r, sunS())), 700.0) * 22.0;
    vec3 washTint = 0.6 + 0.5 * f;
    vec3 wash = palette ? pal * ((dark ? (tinted ? 0.22 : 0.09) : (tinted ? 0.55 : 0.3)) * c) : vec3(0.75, 0.82, 1.0) * washTint * ((dark ? 0.06 : 0.16) * c);
    if (tinted) T *= mix(vec3(1.0), pal, (deep ? 0.85 : 0.55) * c);
    // scene8 is scene7 with the light through the film left neutral: a real film passes the complement
    // of what it reflects, which on a white face turns the rim yellow-green; here it passes grey, so
    // the blue and magenta it reflects are what you see on white too.
    if (uMat >= 22) T = richer ? mix(T, vec3(dot(T, vec3(0.333))), 0.5) : vec3(dot(T, vec3(0.333)));
    if (palantir) {
        float smoke = 0.5 + 0.5 * sin(sw.x * 2.3 + uTime * 0.7) * sin(sw.y * 1.9 - uTime * 0.5);
        wash += f * ((dark ? 0.18 : 0.28) * c) * smoke * hold;
    }
    vec3 haze = (dark ? vec3(0.4, 0.5, 0.72) * (0.045 * (0.6 + 0.4 * sm(-0.6, 0.8, p.y)) + 0.02 * c) : vec3(0.0)) + wash;
    vec3 col = front + back + behind * T + haze + vec3(sun);
    return vec4(pow(softS(col), vec3(1.0 / 2.2)), 1.0);
}

vec4 shade(vec2 fc) {
    vec2 p = (fc - 0.5 * uRes) / (0.5 * uRes.y);
    vec3 ro = vec3(0.0, 0.42, 6.0);
    vec3 f = normalize(-ro);
    vec3 r = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
    vec3 u = cross(r, f);
    float th = tan(asin(1.0 / length(ro))) / uFill;
    vec3 rd = normalize(f + th * (p.x * r + p.y * u));

    float b = dot(ro, rd);
    float cc = dot(ro, ro) - 1.0;
    float h = b * b - cc;
    if (h < 0.0) return vec4(0.0);
    float t = -b - sqrt(h);
    vec3 pos = ro + rd * t;
    vec3 n = normalize(pos);
    float cosT = clamp(dot(n, -rd), 0.0, 1.0);
    float x = 1.0 - cosT;
    vec3 R = reflect(rd, n);
    vec3 refl = env(R);
    float kdif = max(dot(n, keyDir()), 0.0);
    float rl = clamp(dot(refl, vec3(0.2126, 0.7152, 0.0722)), 0.0, 2.0);

    if (uMat == 3 || uMat == 4 || uMat == 5 || uMat == 8 || uMat == 12) {
        // The soap bubble: a thin film front and back, the studio's wall seen through both.
        float flow = pos.y * 3.2 + uTime * 0.5 + 1.2 * sin(pos.x * 2.4 + uTime * 0.27 + 0.5) + 0.6 * sin((pos.x + pos.z) * 4.2 - uTime * 0.35);
        float thick = 3.8 + 1.7 * sin(flow) + 1.4 * x;
        float amp = 0.04 + 0.96 * pow(x, 3.0);
        vec3 p2 = ro + rd * (-b + sqrt(h));
        vec3 n2 = -normalize(p2);
        float cos2 = clamp(dot(n2, -rd), 0.0, 1.0);
        float sun = pow(max(dot(R, sunDir()), 0.0), 700.0) * 22.0;
        if (uMat == 4) {
            // soap1: ACES, a grey wall leaning halfway to the page.
            vec3 R1 = film(cosT, thick, 1.33, 1.35) * amp * 1.6;
            vec3 R2 = film(cos2, thick + 0.6, 1.33, 1.35) * amp * 1.2;
            vec3 wall = mix(vec3(0.6, 0.6, 0.63), uFloor, 0.5) * (0.85 + 0.15 * kdif);
            vec3 col = refl * R1 + env(reflect(rd, n2)) * R2 + wall * (1.0 - R1) * (1.0 - R2) + vec3(sun);
            return vec4(pow(aces(col), vec3(1.0 / 2.2)), 1.0);
        }
        if (uMat == 5) {
            // soap2: the soft curve, a paler wall, more film; on a dark page the page through the film.
            vec3 R1 = film(cosT, thick, 1.33, 1.5) * amp * 1.9;
            vec3 R2 = film(cos2, thick + 0.6, 1.33, 1.5) * amp * 1.4;
            vec3 front = refl * R1;
            vec3 back = env(reflect(rd, n2)) * R2;
            vec3 T = (1.0 - R1) * (1.0 - R2);
            if (uDark > 0.5) {
                vec3 col = pow(soft(front * 1.3 + back + vec3(0.03) + vec3(sun)), vec3(1.0 / 2.2));
                return over(col, 1.0 - dot(T, vec3(0.333)) * 0.92);
            }
            vec3 wall = mix(vec3(0.72, 0.72, 0.75), uFloor, 0.45) * (0.88 + 0.12 * kdif);
            return vec4(pow(soft(front + back + wall * T + vec3(sun)), vec3(1.0 / 2.2)), 1.0);
        }
        // soap3: one object on every page, a fixed pale wall, a film a shade less saturated.
        // soap4: the same on light; as the dark icon, glass on the dark tile.
        vec3 R1 = film(cosT, thick + 0.4, 1.33, 1.2) * amp * 1.9;
        vec3 front = refl * R1;
        vec3 R2 = film(cos2, thick + 1.0, 1.33, 1.2) * amp * 1.4;
        vec3 back = env(reflect(rd, n2)) * R2;
        if (uMat == 8 && uDark > 0.5) return darkBubble(refl, back, film(cosT, thick + 0.4, 1.33, 1.2) * 0.5, n, x, kdif, sun, fresnel(0.02, x), 1.0);
        // soap5: on light a whiter wall, so the ball is white with pastel rather than grey; on dark, darker glass.
        if (uMat == 12 && uDark > 0.5) return darkBubble(refl, back, film(cosT, thick + 0.4, 1.33, 1.2) * 0.4, n, x, kdif, sun, fresnel(0.02, x), 0.35);
        // The wall behind the bubble: the studio's own pale wall, the same on every page, so the
        // bubble is one object wherever it sits (the owner's call), not a page seen through a film.
        vec3 wall = uMat == 12 ? vec3(0.97, 0.97, 0.98) * (0.94 + 0.06 * kdif) : vec3(0.84, 0.84, 0.87) * (0.88 + 0.12 * kdif);
        vec3 T = (1.0 - R1) * (1.0 - R2);
        vec3 col = front + back + wall * T + vec3(sun);
        col = pow(soft(col), vec3(1.0 / 2.2));
        return vec4(col, 1.0);
    }

    if (uMat == 6) {
        // bubble1: a soap film and nothing inside it, tight bands, a breath of haze, the page through it.
        float flow = pos.y * 3.2 + uTime * 0.5 + 1.1 * sin(pos.x * 2.4 + uTime * 0.27) + 0.6 * sin((pos.x + pos.z) * 4.2 - uTime * 0.35);
        float thick = 3.4 + 1.4 * sin(flow) + 0.9 * (0.5 - 0.5 * pos.y) + 0.5 * x;
        float F1 = fresnel(0.02, x);
        vec3 front = refl * film(cosT, thick, 1.33, 1.6) * F1;
        vec3 p2 = ro + rd * (-b + sqrt(h));
        vec3 n2 = -normalize(p2);
        float cos2 = clamp(dot(n2, -rd), 0.0, 1.0);
        float F2 = fresnel(0.02, 1.0 - cos2) * (1.0 - F1);
        vec3 back = env(reflect(rd, n2)) * film(cos2, thick + 0.6, 1.33, 1.6) * F2;
        float haze = 0.2 + 0.1 * kdif;
        vec3 milk = mix(vec3(1.0), film(cosT, thick, 1.33, 1.3), 0.7) * haze;
        vec3 face = film(cosT, thick, 1.33, 1.6) * (0.14 + 0.5 * rl) * (1.0 - x) * 0.35;
        float pool = pow(x, 2.0) * (0.5 + 0.5 * smoothstep(0.3, -0.7, n.y)) * 0.35;
        vec3 col = front * 2.0 + back * 1.4 + milk + face + vec3(pool) * film(cosT, thick, 1.33, 1.4);
        float a = clamp(F1 + F2 + haze + pool * 0.6 + 0.12 * (1.0 - x), 0.0, 1.0);
        return vec4(pow(aces(col), vec3(1.0 / 2.2)), a);
    }

    if (uMat == 2 || uMat == 7 || uMat == 9 || uMat == 13) {
        // bubble2: broad washes after the reference, blue on top, magenta low left, a hot spot, a double rim.
        // bubble3: the same, and on a dark page no pale body: the page through the film.
        // bubble4: bubble2 on light; as the dark icon, glass on the dark tile with the washes over it.
        // bubble5: on light whiter, the body nearer white and the haze fuller; on dark, darker glass.
        float dark = uMat == 2 ? uDark : 0.0;
        float white = uMat == 13 ? 1.0 : 0.0;
        // Broad, slow swaths rather than tight bands: the film varies over the whole ball, not every few degrees.
        float flow = pos.y * 1.3 + uTime * 0.3 + 0.9 * sin(pos.x * 1.1 + uTime * 0.17) + 0.5 * sin((pos.x + pos.z) * 1.8 - uTime * 0.23);
        float thick = 2.6 + 0.9 * sin(flow) + 0.5 * (0.5 - 0.5 * pos.y) + 0.8 * x;
        float F1 = fresnel(0.02, x);
        vec3 front = refl * film(cosT, thick, 1.33, 1.4) * F1;
        // The far side of the shell, seen through the near one, mirrors the studio the other way.
        vec3 p2 = ro + rd * (-b + sqrt(h));
        vec3 n2 = -normalize(p2);
        float cos2 = clamp(dot(n2, -rd), 0.0, 1.0);
        float F2 = fresnel(0.02, 1.0 - cos2) * (1.0 - F1);
        vec3 back = env(reflect(rd, n2)) * film(cos2, thick + 0.6, 1.33, 1.6) * F2;
        // A bright milky body, lit from the top left, with the film's colour laid over it in soft washes.
        float haze = dark > 0.5 ? 0.1 + 0.06 * kdif : 0.62 + 0.18 * kdif + 0.2 * white;
        vec3 wash = film(cosT, thick, 1.33, 1.25);
        // The reference leans blue and pink: the film's green is held back, its blue and red let through.
        wash = wash * vec3(1.1, 0.7, 1.3) + vec3(0.02, 0.0, 0.12);
        // The body itself is pale blue at the top and pink low left, as the reference is lit.
        vec3 body = mix(vec3(0.5, 0.76, 1.0), vec3(0.92, 0.42, 0.9), smoothstep(0.55, -0.55, n.y + n.x * 0.45));
        // A pale centre, so the colour sits at the sides and the ball reads as lit from within.
        body = mix(body, vec3(0.92, 0.95, 1.0), (dark > 0.5 ? 0.0 : 0.55 + 0.25 * white) * smoothstep(0.75 + 0.2 * white, 0.2, length(n.xy - vec2(0.15, 0.2))));
        if ((uMat == 9 || uMat == 13) && uDark > 0.5) {
            vec3 hot4 = normalize(vec3(-0.12, -0.62, 0.77));
            float spot4 = pow(max(dot(n, hot4), 0.0), 40.0);
            float sun4 = spot4 * (uMat == 13 ? 1.0 : 1.6);
            return darkBubble(refl, back, mix(body, wash, 0.5) * (uMat == 13 ? 0.6 : 0.9), n, x, kdif, sun4, F1, uMat == 13 ? 0.35 : 1.0);
        }
        vec3 milk = mix(body, wash, 0.4) * haze;
        vec3 face = wash * (0.12 + 0.4 * rl) * (1.0 - x) * 0.3;
        // Light that came in at the top leaves low in the ball: a warm hot spot, and a glow along the bottom rim.
        vec3 hot = normalize(vec3(-0.12, -0.62, 0.77));
        float spot = pow(max(dot(n, hot), 0.0), 40.0);
        vec3 glowc = vec3(1.0, 0.95, 0.85) * spot * 3.0 + vec3(1.0, 0.65, 0.9) * pow(max(dot(n, hot), 0.0), 5.0) * 0.6;
        float pool = pow(x, 2.0) * (0.5 + 0.5 * smoothstep(0.3, -0.7, n.y)) * 0.3;
        // The glass rim: a thin bright line where the shell is seen edge-on.
        float rim = smoothstep(0.86, 0.985, x) * (1.0 - smoothstep(0.985, 1.0, x));
        // The shell has thickness: a second, fainter contour a little way in, as the reference shows.
        float inner = smoothstep(0.62, 0.72, x) * (1.0 - smoothstep(0.72, 0.8, x));
        vec3 col = front * 1.6 + back * 1.2 + milk + face + glowc + vec3(pool) * wash + vec3(rim) * 0.7 + vec3(inner) * 0.18;
        float a = clamp(F1 + F2 + haze + spot * 0.5 + pool * 0.6 + rim * 0.5 + 0.15 * (1.0 - x), 0.0, 1.0);
        col = pow(aces(col), vec3(1.0 / 2.2));
        if (dark > 0.5) return over(col, a);
        return vec4(col, a);
    }

    return vec4(0.0);
}

void main() {
    vec4 acc = vec4(0.0);
    for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
        vec2 off = vec2(float(i) + 0.5, float(j) + 0.5) * 0.5;
        acc += uScene > 0.5 ? sceneShade(gl_FragCoord.xy - 0.5 + off) : shade(gl_FragCoord.xy - 0.5 + off);
    }
    acc *= 0.25;
    O = vec4(acc.rgb * acc.a, acc.a);
}`;

/** The floor and backdrop the orb mirrors, in linear light, for the surface it sits on. */
export const ORB_GLASS_FLOOR: Record<"light" | "dark", [number, number, number]> = {
    light: [1, 1, 1],
    dark: [0.047, 0.055, 0.07],
};

/**
 * Where the lights go for a pointer at (x, y) on a page, for an orb whose centre is at (cx, cy)
 * and whose reach is `reach` px: -1..1 each way, and 0 when the pointer is on the orb itself.
 * The reach is well past the orb, so every orb on a page leans the same way at once.
 */
export function orbGlassTilt(x: number, y: number, cx: number, cy: number, reach: number): [number, number] {
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    return [clamp((x - cx) / reach), clamp((cy - y) / reach)];
}
