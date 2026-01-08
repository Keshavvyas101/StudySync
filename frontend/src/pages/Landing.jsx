import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 space-y-32">

      {/* ================= HERO ================= */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center pt-16">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight
                         text-slate-900 dark:text-slate-100">
            Study smarter.
            <br />
            Together.
          </h1>

          <p className="mt-6 text-lg text-slate-600 dark:text-slate-400">
            StudySync is a collaborative study platform where students
            plan tasks, work together in rooms, and communicate in real time.
          </p>

          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No distractions. Just focused collaboration.
          </p>

          {/* CTA */}
          <div className="mt-8 flex gap-4">
            <Link
              to="/register"
              className="px-6 py-3 rounded-lg
                         bg-purple-600 hover:bg-purple-700
                         text-white font-medium transition"
            >
              Get Started
            </Link>

            <Link
              to="/login"
              className="px-6 py-3 rounded-lg
                         border border-slate-300 dark:border-slate-700
                         text-slate-700 dark:text-slate-300
                         hover:bg-slate-100 dark:hover:bg-slate-800
                         transition"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Preview */}
        <div
          className="rounded-2xl border
                     border-slate-300 dark:border-slate-800
                     bg-white dark:bg-slate-900
                     p-6 shadow-sm"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            App preview
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <PreviewCard />
            <PreviewCard />
            <PreviewCard />
            <PreviewCard />
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section>
        <h2 className="text-3xl font-semibold mb-12
                       text-slate-900 dark:text-slate-100">
          Core features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Feature title="Study Rooms" desc="Organize work by rooms and collaborate seamlessly." />
          <Feature title="Task Planning" desc="Assign tasks, set priorities, and track progress." />
          <Feature title="Real-time Chat" desc="Communicate instantly with room members." />
          <Feature title="Notifications" desc="Never miss important updates or changes." />
          <Feature title="Secure Auth" desc="JWT-based authentication with protected routes." />
          <Feature title="Scalable" desc="Built with Socket.io and the MERN stack." />
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section>
        <h2 className="text-3xl font-semibold mb-12
                       text-slate-900 dark:text-slate-100">
          How it works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <Step n="1" text="Create or join a study room" />
          <Step n="2" text="Add tasks and assign priorities" />
          <Step n="3" text="Chat and collaborate in real time" />
          <Step n="4" text="Stay productive together" />
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="text-center py-24">
        <h3 className="text-3xl font-semibold mb-4
                       text-slate-900 dark:text-slate-100">
          Ready to start studying smarter?
        </h3>

        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Create your free account and collaborate instantly.
        </p>

        <Link
          to="/register"
          className="inline-block px-8 py-3 rounded-lg
                     bg-purple-600 hover:bg-purple-700
                     text-white font-medium transition"
        >
          Create free account
        </Link>
      </section>

      {/* ================= FOOTER ================= */}
      <footer
        className="border-t border-slate-300 dark:border-slate-800
                   py-8 text-center text-sm
                   text-slate-500 dark:text-slate-400"
      >
        © {new Date().getFullYear()} StudySync · Built for collaborative learning
      </footer>
    </div>
  );
};

/* ---------- Components ---------- */

const Feature = ({ title, desc }) => (
  <div
    className="p-6 rounded-xl
               bg-white dark:bg-slate-900
               border border-slate-300 dark:border-slate-800
               hover:shadow-md transition"
  >
    <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
      {title}
    </h3>
    <p className="text-sm text-slate-600 dark:text-slate-400">
      {desc}
    </p>
  </div>
);

const Step = ({ n, text }) => (
  <div
    className="p-6 rounded-xl
               bg-white dark:bg-slate-900
               border border-slate-300 dark:border-slate-800
               text-center"
  >
    <div className="text-3xl font-bold text-purple-600 mb-2">
      {n}
    </div>
    <p className="text-sm text-slate-600 dark:text-slate-400">
      {text}
    </p>
  </div>
);

const PreviewCard = () => (
  <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
);

export default Landing;
