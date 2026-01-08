const stringToColor = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const color = `hsl(${hash % 360}, 65%, 55%)`;
  return color;
};

const Avatar = ({ name = "", size = 36 }) => {
  const letter = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: stringToColor(name),
      }}
      title={name}
    >
      {letter || "?"}
    </div>
  );
};

export default Avatar;
