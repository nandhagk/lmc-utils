export function Home() {
  const backgrounds = ["yogi", "shishu", "migil"];
  return (
    <div
      className="h-full bg-repeat-round"
      style={{ backgroundImage: `url('./${backgrounds[Math.floor(Math.random() * backgrounds.length)]}.jpeg')` }}
    ></div>
  );
}
