import {shortcutLabels} from 'common/ui-text';
interface Props {
  text: string;
}

const ShortcutName = ({text}: Props) => {
  const formattedText = shortcutLabels[text as keyof typeof shortcutLabels] ?? '其他快捷键';
  return <div className="capitalize">{formattedText}</div>;
};

export default ShortcutName;
