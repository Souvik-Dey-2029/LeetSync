let modalOverrides = null;

export function setModalHandlerOverrides(handlers) {
  modalOverrides = handlers;
}

export function showSyncConfirmationModal() {
  if (modalOverrides && typeof modalOverrides.confirmSync === 'function') {
    return Promise.resolve(modalOverrides.confirmSync());
  }

  return new Promise(resolve => {
    if (typeof document === 'undefined') {
      return resolve(true);
    }

    const existing = document.getElementById('leetsync-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'leetsync-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: #1e1e1e;
      color: #ffffff;
      border: 1px solid #333333;
      border-radius: 12px;
      padding: 24px;
      width: 380px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      text-align: center;
    `;

    box.innerHTML = `
      <div style="font-size: 20px; font-weight: 700; color: #ffa116; margin-bottom: 14px; letter-spacing: 0.5px;">LeetSync</div>
      <div style="font-size: 15px; font-weight: 500; margin-bottom: 22px; line-height: 1.5; color: #e0e0e0;">
        Sync this submission to GitHub?
      </div>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="leetsync-btn-yes" style="
          flex: 1; padding: 10px 16px; border-radius: 8px; border: none;
          background: #2cbb5d; color: white; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;
        ">Yes, Sync</button>
        <button id="leetsync-btn-no" style="
          flex: 1; padding: 10px 16px; border-radius: 8px; border: 1px solid #444;
          background: #2a2a2a; color: #ccc; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;
        ">No, Don't Sync</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const yesBtn = document.getElementById('leetsync-btn-yes');
    const noBtn = document.getElementById('leetsync-btn-no');

    yesBtn.onclick = () => {
      overlay.remove();
      resolve(true);
    };

    noBtn.onclick = () => {
      overlay.remove();
      resolve(false);
    };
  });
}

export function showExistingProblemModal() {
  if (modalOverrides && typeof modalOverrides.existingAction === 'function') {
    return Promise.resolve(modalOverrides.existingAction());
  }

  return new Promise(resolve => {
    if (typeof document === 'undefined') {
      return resolve('add');
    }

    const existing = document.getElementById('leetsync-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'leetsync-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: #1e1e1e;
      color: #ffffff;
      border: 1px solid #333333;
      border-radius: 12px;
      padding: 24px;
      width: 420px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      text-align: center;
    `;

    box.innerHTML = `
      <div style="font-size: 20px; font-weight: 700; color: #ffa116; margin-bottom: 14px; letter-spacing: 0.5px;">LeetSync</div>
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #ffffff;">
        This problem is already in your GitHub repository.
      </div>
      <div style="font-size: 13px; color: #aaa; margin-bottom: 22px; line-height: 1.5;">
        Do you want to save this submission as another solution?
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button id="leetsync-btn-add" style="
          width: 100%; padding: 11px 16px; border-radius: 8px; border: none;
          background: #2cbb5d; color: white; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;
        ">Yes, Add Another Solution</button>
        <button id="leetsync-btn-replace" style="
          width: 100%; padding: 11px 16px; border-radius: 8px; border: 1px solid #ff4d4f;
          background: rgba(255, 77, 79, 0.12); color: #ff4d4f; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s;
        ">No, Replace Existing Solution</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const addBtn = document.getElementById('leetsync-btn-add');
    const replaceBtn = document.getElementById('leetsync-btn-replace');

    addBtn.onclick = () => {
      overlay.remove();
      resolve('add');
    };

    replaceBtn.onclick = () => {
      overlay.remove();
      resolve('replace');
    };
  });
}
