const stringToColor = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360}, 65%, 55%)`;
};

const Avatar = ({ name = "", src, size = 36 }) => {
  const letter = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-full select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: src ? "transparent" : stringToColor(name),
      }}
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <span className="text-white font-semibold">
          {letter || "?"}
        </span>
      )}
    </div>
  );
};

export default Avatar;
