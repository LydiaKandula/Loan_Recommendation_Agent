function Sidebar({
  activePage,
  setActivePage,
}) {

  const menus = [
    "Dashboard",
    "Loan Form",
    "Chat Assistant",
    "Logs",
  ];

  return (
    <div className="sidebar">

      <div className="logo">
        LoanAI
      </div>

      <div className="menu">

        {menus.map((item, index) => (

          <button
            key={index}
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