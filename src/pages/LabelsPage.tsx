import { useState } from 'react';
import { Plus, Trash2, Loader2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useLabels } from '@/hooks/useLabels';
import { useI18n } from '@/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export default function LabelsPage() {
  const { labels, isLoading, createLabel, deleteLabel } = useLabels();
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createLabel.mutateAsync({ name: newName.trim(), color: newColor });
    setAddOpen(false);
    setNewName('');
    setNewColor('#3b82f6');
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ lineHeight: '1.1' }}>{t.labels.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.labels.manageLabels}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t.labels.addLabel}
        </Button>
      </div>

      {labels.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold mb-1">{t.labels.noLabels}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t.labels.createFirst}</p>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> {t.labels.addLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {labels.map((label) => (
            <div key={label.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div
                className="h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: label.color }}
              />
              <span className="flex-1 font-medium text-sm">{label.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(label.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.labels.addLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.labels.labelName}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.labels.labelName}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.labels.labelColor}</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: newColor === color ? 'hsl(var(--foreground))' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>{t.common.cancel}</Button>
              <Button onClick={handleAdd} disabled={!newName.trim() || createLabel.isPending}>
                {createLabel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={t.labels.deleteLabel}
        description={t.labels.deleteLabelDesc}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        onConfirm={() => { if (deleteTarget) { deleteLabel.mutate(deleteTarget); setDeleteTarget(null); } }}
        variant="destructive"
      />
    </div>
  );
}
