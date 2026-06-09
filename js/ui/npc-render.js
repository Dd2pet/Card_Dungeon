const NpcRenderSystem = (() => {
  function render() {
    // NPCs now live inside the Guild tab; refresh if active
    if (typeof NavSystem !== 'undefined' && NavSystem.current === 'guild') {
      GuildRenderSystem.render();
    }
  }
  return { render };
})();
