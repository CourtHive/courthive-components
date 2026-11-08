import { createDisplaySettings, displaySettingsLabels } from './createDisplaySettings';
import { cModal } from '../modal/cmodal';

// constants and types
import type { DisplaySettingsDialogConfig } from './displaySettingsTypes';

/** Reusable display-settings modal; the host persists its complete snapshot on Save. */
export function openDisplaySettingsDialog(config: DisplaySettingsDialogConfig) {
  const labels = { ...displaySettingsLabels, ...config.labels };
  const content = document.createElement('div');
  const modalConfig = { maxWidth: config.mode === 'advanced' ? 1120 : 600, content: { padding: '1' }, padding: '.5' };
  let modal: ReturnType<typeof cModal.open> | undefined;
  const editor = createDisplaySettings(content, {
    ...config,
    onModeChange: (mode) => {
      modal?.update({ config: { ...modalConfig, maxWidth: mode === 'advanced' ? 1120 : 600 } });
      config.onModeChange?.(mode);
    }
  });
  modal = cModal.open({
    title: labels.title,
    content,
    config: modalConfig,
    buttons: [
      { label: labels.cancel, intent: 'none', close: true },
      {
        label: labels.save,
        id: config.saveButtonId,
        intent: 'is-info',
        close: true,
        onClick: () => config.onSave(editor.getComposition())
      }
    ],
    onClose: () => {
      editor.destroy();
      config.onClose?.();
    }
  });
  return { ...editor, close: modal.close };
}
