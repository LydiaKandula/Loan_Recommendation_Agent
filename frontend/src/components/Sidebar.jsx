function Sidebar({
  activePage,
  setActivePage,
}) {

  const menuItems = [
    "Dashboard",
    "Loan Form",
    "Chat Assistant",
    "Logs",
  ];

  return (
    <div>

      <div className="logo">
        Loan AI System
      </div>

      <div className="menu">

        {menuItems.map((item) => (

          <button
            key={item}
            className={
              activePage === item
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage(item)
            }
          >
            {item}
          </button>

        ))}

      </div>

    </div>
  );
}

export default Sidebar;