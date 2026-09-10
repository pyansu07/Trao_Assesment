// Minimal fixture HTTP server used to exercise the crawler against a
// localhost target: relative links, a careers/hiring page, and an
// interview-process mention, without any external network dependency.
// Run with: npm run fixture-server (defaults to port 8099)
import http from "node:http";

const PORT = Number(process.env.FIXTURE_PORT ?? 8099);

const pages: Record<string, string> = {
  "/robots.txt": `User-agent: *\nDisallow: /private\n`,

  "/private": `<!DOCTYPE html><html><head><title>Private | Acme Robotics</title></head><body>
    <p>This page is disallowed by robots.txt and must never be fetched by the crawler.</p>
  </body></html>`,

  "/": `<!DOCTYPE html><html><head><title>Acme Robotics | Home</title></head><body>
    <nav>
      <a href="/about">About</a>
      <a href="/careers">Careers</a>
      <a href="mailto:hello@acme.test">Email us</a>
      <a href="https://example.com/not-acme">External partner</a>
    </nav>
    <h1>Acme Robotics</h1>
    <p>Acme Robotics builds autonomous warehouse robots that help fulfillment centers move faster and safer.</p>
  </body></html>`,

  "/about": `<!DOCTYPE html><html><head><title>About | Acme Robotics</title></head><body>
    <h1>About Acme Robotics</h1>
    <p>Founded in 2016, Acme Robotics designs perception and navigation software for warehouse robots.
    Our team is distributed across three continents and we ship weekly.</p>
    <a href="/careers">See open roles</a>
  </body></html>`,

  "/careers": `<!DOCTYPE html><html><head><title>Careers | Acme Robotics</title></head><body>
    <h1>Careers at Acme Robotics</h1>
    <p>We're hiring engineers who care about robust, testable robotics software.</p>
    <p>Our interview process: a 30 minute recruiter call, a technical screen, an onsite loop with
    system design and behavioural rounds, and a final team-fit conversation.</p>
    <a href="/careers/engineering">Engineering roles</a>
    <a href="/culture">Culture & handbook</a>
    <a href="/private">Internal team handbook (robots.txt-disallowed - must not be fetched)</a>
  </body></html>`,

  "/careers/engineering": `<!DOCTYPE html><html><head><title>Engineering Roles | Acme Robotics</title></head><body>
    <h1>Engineering roles</h1>
    <p>We are hiring backend engineers with strong distributed systems fundamentals, and robotics
    engineers with ROS experience. We value mentorship and clear written communication.</p>
  </body></html>`,

  "/culture": `<!DOCTYPE html><html><head><title>Culture & Handbook | Acme Robotics</title></head><body>
    <h1>Our culture</h1>
    <p>We work in small autonomous teams, write decision docs before big changes, and default to
    async communication given our distributed team.</p>
  </body></html>`,
};

const server = http.createServer((req, res) => {
  const path = (req.url ?? "/").split("?")[0];
  const body = pages[path];
  if (!body) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  const contentType = path === "/robots.txt" ? "text/plain; charset=utf-8" : "text/html; charset=utf-8";
  res.writeHead(200, { "Content-Type": contentType });
  res.end(body);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Fixture company site running at http://localhost:${PORT}/`);
});
