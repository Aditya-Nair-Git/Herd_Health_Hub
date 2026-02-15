import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Loader2 } from 'lucide-react';

interface VetNote {
  id: string;
  note_title: string;
  note_content: string;
  medical_tags: string | null;
  created_at: string;
  vet_id: string;
  profiles?: { full_name: string } | null;
}

interface VetNotesSectionProps {
  animalId: string;
}

export function VetNotesSection({ animalId }: VetNotesSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<VetNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  useEffect(() => {
    fetchNotes();
  }, [animalId]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('vet_notes')
      .select('*')
      .eq('animal_id', animalId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch vet names separately
      const vetIds = [...new Set(data.map(n => n.vet_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', vetIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      setNotes(data.map(n => ({ ...n, profiles: profileMap.has(n.vet_id) ? { full_name: profileMap.get(n.vet_id)! } : null })));
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Error', description: 'Title and content are required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('vet_notes').insert({
      animal_id: animalId,
      vet_id: user?.id,
      note_title: form.title.trim(),
      note_content: form.content.trim(),
      medical_tags: form.tags.trim() || null,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to save note', variant: 'destructive' });
    } else {
      toast({ title: 'Note Saved', description: 'Medical note has been recorded.' });
      setDialogOpen(false);
      setForm({ title: '', content: '', tags: '' });
      fetchNotes();
    }
    setSubmitting(false);
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Medical Notes ({notes.length})
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Medical Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input placeholder="e.g., Post-treatment observation" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea placeholder="Detailed medical observations..." value={form.content} onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Medical Tags (comma-separated)</Label>
                <Input placeholder="e.g., post-op, inflammation, chronic" value={form.tags} onChange={(e) => setForm(p => ({ ...p, tags: e.target.value }))} />
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">No medical notes recorded yet</p>
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <div key={note.id} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-sm">{note.note_title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(note.created_at).toLocaleDateString()}</p>
                </div>
                <p className="text-sm text-muted-foreground">{note.note_content}</p>
                {note.medical_tags && (
                  <div className="flex flex-wrap gap-1">
                    {note.medical_tags.split(',').map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag.trim()}</Badge>
                    ))}
                  </div>
                )}
                {note.profiles && (
                  <p className="text-xs text-muted-foreground">— Dr. {note.profiles.full_name}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
