'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  CreditCard,
  Calendar,
  Ban,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ProposalPricingNote, NoteType } from '@/lib/api/endpoints/proposals';

interface PricingNotesPanelProps {
  notes: ProposalPricingNote[];
  onAddNote: (note: Partial<ProposalPricingNote>) => void;
  onUpdateNote: (noteId: string, updates: Partial<ProposalPricingNote>) => void;
  onDeleteNote: (noteId: string) => void;
  readonly?: boolean;
}

export function PricingNotesPanel({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  readonly = false,
}: PricingNotesPanelProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // New note state
  const [newNote, setNewNote] = useState<Partial<ProposalPricingNote>>({
    noteType: NoteType.GENERAL,
    content: '',
  });

  // Editing note state
  const [editingNoteContent, setEditingNoteContent] = useState('');

  const handleAddNote = () => {
    if (!newNote.content || newNote.content.trim().length < 10) {
      alert('Note content must be at least 10 characters');
      return;
    }

    onAddNote({
      ...newNote,
      sortOrder: notes.length,
    });

    setNewNote({ noteType: NoteType.GENERAL, content: '' });
    setIsAddingNote(false);
  };

  const startEditingNote = (note: ProposalPricingNote) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const handleUpdateNote = (noteId: string) => {
    if (editingNoteContent.trim().length < 10) {
      alert('Note content must be at least 10 characters');
      return;
    }

    onUpdateNote(noteId, { content: editingNoteContent });
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleMoveNote = (noteId: string, direction: 'up' | 'down') => {
    const currentIndex = notes.findIndex((note) => note.id === noteId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= notes.length) return;

    // Update sort orders
    onUpdateNote(notes[currentIndex].id, { sortOrder: newIndex });
    onUpdateNote(notes[newIndex].id, { sortOrder: currentIndex });
  };

  const getNoteTypeIcon = (noteType: NoteType) => {
    switch (noteType) {
      case NoteType.PAYMENT_METHOD:
        return <CreditCard className="w-4 h-4" />;
      case NoteType.TERMS:
        return <FileText className="w-4 h-4" />;
      case NoteType.CANCELLATION:
        return <Ban className="w-4 h-4" />;
      case NoteType.GENERAL:
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getNoteTypeLabel = (noteType: NoteType) => {
    switch (noteType) {
      case NoteType.PAYMENT_METHOD:
        return 'Payment Methods';
      case NoteType.TERMS:
        return 'Terms & Conditions';
      case NoteType.CANCELLATION:
        return 'Cancellation Policy';
      case NoteType.GENERAL:
      default:
        return 'General Note';
    }
  };

  const getNoteTypeColor = (noteType: NoteType) => {
    switch (noteType) {
      case NoteType.PAYMENT_METHOD:
        return 'bg-blue-100 text-blue-800';
      case NoteType.TERMS:
        return 'bg-purple-100 text-purple-800';
      case NoteType.CANCELLATION:
        return 'bg-red-100 text-red-800';
      case NoteType.GENERAL:
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedNotes = notes.reduce(
    (acc, note) => {
      const type = note.noteType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(note);
      return acc;
    },
    {} as Record<NoteType, ProposalPricingNote[]>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Pricing Notes</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Add global notes about payment methods, terms, and policies
            </p>
          </div>
          {!readonly && (
            <Button size="sm" onClick={() => setIsAddingNote(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add New Note Form */}
        {isAddingNote && (
          <div className="p-4 border-2 border-dashed rounded-lg space-y-3 bg-gray-50">
            <h4 className="font-medium text-sm">Add New Note</h4>

            <div>
              <Label className="text-xs">Note Type</Label>
              <Select
                value={newNote.noteType}
                onValueChange={(value) =>
                  setNewNote({ ...newNote, noteType: value as NoteType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NoteType.PAYMENT_METHOD}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Payment Methods
                    </div>
                  </SelectItem>
                  <SelectItem value={NoteType.TERMS}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Terms & Conditions
                    </div>
                  </SelectItem>
                  <SelectItem value={NoteType.CANCELLATION}>
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      Cancellation Policy
                    </div>
                  </SelectItem>
                  <SelectItem value={NoteType.GENERAL}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      General Note
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Content (min 10 characters)</Label>
              <Textarea
                value={newNote.content || ''}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Enter note content..."
                rows={4}
                className="resize-none"
              />
              <span
                className={`text-xs ${(newNote.content?.length || 0) < 10 ? 'text-red-500' : 'text-gray-500'}`}
              >
                {newNote.content?.length || 0}/10 minimum characters
              </span>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddNote}>
                <Check className="w-4 h-4 mr-1" />
                Add Note
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNote({ noteType: NoteType.GENERAL, content: '' });
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing Notes */}
        {notes.length === 0 && !isAddingNote ? (
          <div className="text-center py-8 space-y-3 border-2 border-dashed rounded-lg">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No Notes Added</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Add notes to document payment methods, terms, and cancellation policies
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedNotes).map(([noteType, notesOfType]) => (
              <div key={noteType} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <div className="flex items-center gap-2">
                    {getNoteTypeIcon(noteType as NoteType)}
                    <span className="text-sm font-medium">
                      {getNoteTypeLabel(noteType as NoteType)}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      {notesOfType.length}
                    </Badge>
                  </div>
                </div>

                <div className="divide-y">
                  {notesOfType.map((note, index) => (
                    <div key={note.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                rows={4}
                                className="resize-none"
                              />
                              <div className="flex justify-between items-center">
                                <span
                                  className={`text-xs ${editingNoteContent.length < 10 ? 'text-red-500' : 'text-gray-500'}`}
                                >
                                  {editingNoteContent.length}/10 minimum
                                </span>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateNote(note.id)}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditing}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Badge
                                className={`${getNoteTypeColor(note.noteType)} mb-2`}
                              >
                                {getNoteTypeLabel(note.noteType)}
                              </Badge>
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {note.content}
                              </p>
                            </>
                          )}
                        </div>

                        {!readonly && editingNoteId !== note.id && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveNote(note.id, 'up')}
                              disabled={index === 0}
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveNote(note.id, 'down')}
                              disabled={index === notesOfType.length - 1}
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingNote(note)}
                              title="Edit note"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteNote(note.id)}
                              title="Delete note"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Templates */}
        {!readonly && notes.length === 0 && !isAddingNote && (
          <div className="mt-4 space-y-2">
            <Label className="text-xs font-medium text-gray-700">
              Quick Start Templates
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="justify-start h-auto py-2"
                onClick={() => {
                  setNewNote({
                    noteType: NoteType.PAYMENT_METHOD,
                    content:
                      'We accept ACH, wire transfer, and all major credit cards. Credit card payments incur a 3% processing fee.',
                  });
                  setIsAddingNote(true);
                }}
              >
                <CreditCard className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-xs text-left">Payment Methods Template</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="justify-start h-auto py-2"
                onClick={() => {
                  setNewNote({
                    noteType: NoteType.TERMS,
                    content:
                      'All services are provided under our standard Master Services Agreement. Payment terms are Net 30 unless otherwise specified.',
                  });
                  setIsAddingNote(true);
                }}
              >
                <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-xs text-left">Terms Template</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="justify-start h-auto py-2"
                onClick={() => {
                  setNewNote({
                    noteType: NoteType.CANCELLATION,
                    content:
                      '30-day written notice required for cancellation. Services will continue through the notice period at the current rate.',
                  });
                  setIsAddingNote(true);
                }}
              >
                <Ban className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-xs text-left">Cancellation Template</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="justify-start h-auto py-2"
                onClick={() => {
                  setNewNote({
                    noteType: NoteType.GENERAL,
                    content:
                      'All fees are quoted in USD and exclude applicable sales tax unless otherwise noted.',
                  });
                  setIsAddingNote(true);
                }}
              >
                <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-xs text-left">General Note Template</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
