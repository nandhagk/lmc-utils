export function Home() {
  const backgrounds = ["yogi", "shishu", "migil", "miben"];
  return (
    <div
      className="h-full bg-repeat-round"
      style={{ backgroundImage: `url('./${backgrounds[Math.floor(Math.random() * backgrounds.length)]}.jpeg')` }}
    ></div>
  );
}
