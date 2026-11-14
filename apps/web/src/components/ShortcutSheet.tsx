import { Modal } from './Modal';

const SHORTCUTS = [
  { group: '播放', keys: ['Space'], label: '播放 / 暂停' },
  { group: '播放', keys: ['←', '→'], label: '后退 / 前进 5 秒' },
  { group: '播放', keys: ['Shift', '←/→'], label: '上一首 / 下一首' },
  { group: '播放', keys: ['L'], label: '喜欢当前曲目' },
  { group: '播放', keys: ['Q'], label: '打开队列工作台' },
  { group: '导航', keys: ['⌘K', 'Ctrl K'], label: '打开命令面板' },
  { group: '导航', keys: ['/'], label: '聚焦搜索' },
  { group: '导航', keys: ['?'], label: '打开快捷键说明' },
  { group: '导航', keys: ['Esc'], label: '关闭当前浮层' },
  { group: '通用', keys: ['Tab'], label: '在控件间移动焦点' },
  { group: '通用', keys: ['Enter'], label: '执行当前控件' },
];

export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="键盘快捷键" kicker="不用鼠标也能听完整张专辑" size="medium" onClose={onClose}>
      <p className="shortcut-intro">
        声屿把键盘作为一等公民。以下快捷键在输入框聚焦时自动让位，不会干扰打字。
      </p>
      <div className="shortcut-groups">
        {['播放', '导航', '通用'].map((group) => (
          <section key={group} className="shortcut-group">
            <h3>{group}</h3>
            <dl>
              {SHORTCUTS.filter((shortcut) => shortcut.group === group).map((shortcut) => (
                <div key={shortcut.label} className="shortcut-row">
                  <dt>{shortcut.label}</dt>
                  <dd>
                    {shortcut.keys.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="shortcut-note">
        在「账户 → 外观与播放」中可以开启「减少动效」，键盘焦点始终有高对比描边。按 <kbd>?</kbd> 可随时回到这里。
      </p>
    </Modal>
  );
}