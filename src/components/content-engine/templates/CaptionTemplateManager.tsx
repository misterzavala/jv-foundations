// Caption Template Manager Component
// Create, edit, and manage caption templates

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Eye,
  Save,
  X,
  FileText,
  Instagram,
  Linkedin,
  MessageCircle,
  Share2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { captionRenderer } from "@/services/caption-renderer";
import type { Tables, Platform, ContentType } from "@/integrations/supabase/types-enhanced";

interface CaptionTemplateManagerProps {
  className?: string;
}

export default function CaptionTemplateManager({ className }: CaptionTemplateManagerProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Tables<'caption_templates'> | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Tables<'caption_templates'> | null>(null);

  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['caption-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caption_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const handleEditTemplate = (template: Tables<'caption_templates'>) => {
    setSelectedTemplate(template);
    setIsEditModalOpen(true);
  };

  const handlePreviewTemplate = (template: Tables<'caption_templates'>) => {
    setPreviewTemplate(template);
    setIsPreviewMode(true);
  };

  const handleDuplicateTemplate = async (template: Tables<'caption_templates'>) => {
    try {
      await supabase
        .from('caption_templates')
        .insert({
          name: `${template.name} (Copy)`,
          template: template.template,
          platform: template.platform,
          content_type: template.content_type,
          variables: template.variables,
          is_active: true
        });
      
      queryClient.invalidateQueries({ queryKey: ['caption-templates'] });
    } catch (error) {
      console.error('Failed to duplicate template:', error);
    }
  };

  const getPlatformIcon = (platform: Platform | null) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'tiktok':
        return <MessageCircle className="h-4 w-4" />;
      case 'facebook':
        return <Share2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getPlatformColor = (platform: Platform | null) => {
    switch (platform) {
      case 'instagram':
        return 'bg-pink-100 text-pink-800';
      case 'linkedin':
        return 'bg-blue-100 text-blue-800';
      case 'tiktok':
        return 'bg-black text-white';
      case 'facebook':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Caption Templates</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage reusable caption templates for different platforms
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <TemplateFormModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSave={() => {
              setIsCreateModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ['caption-templates'] });
            }}
          />
        </Dialog>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading templates...</span>
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium truncate">
                    {template.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreviewTemplate(template)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center space-x-2 mt-2">
                  {template.platform && (
                    <Badge className={cn("text-xs", getPlatformColor(template.platform))}>
                      {getPlatformIcon(template.platform)}
                      <span className="ml-1 capitalize">{template.platform}</span>
                    </Badge>
                  )}
                  {template.content_type && (
                    <Badge variant="secondary" className="text-xs">
                      {template.content_type.replace('_', ' ')}
                    </Badge>
                  )}
                  {!template.is_active && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground line-clamp-4 mb-3">
                  {template.template}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {Array.isArray(template.variables) ? template.variables.length : 0} variables
                  </span>
                  <span>
                    {new Date(template.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first caption template to get started
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <TemplateFormModal
          isOpen={isEditModalOpen}
          template={selectedTemplate}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTemplate(null);
          }}
          onSave={() => {
            setIsEditModalOpen(false);
            setSelectedTemplate(null);
            queryClient.invalidateQueries({ queryKey: ['caption-templates'] });
          }}
        />
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewMode} onOpenChange={setIsPreviewMode}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <TemplatePreview 
              template={previewTemplate} 
              onClose={() => setIsPreviewMode(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Template Form Modal Component
interface TemplateFormModalProps {
  isOpen: boolean;
  template?: Tables<'caption_templates'> | null;
  onClose: () => void;
  onSave: () => void;
}

function TemplateFormModal({ isOpen, template, onClose, onSave }: TemplateFormModalProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    template: template?.template || '',
    platform: template?.platform || '',
    content_type: template?.content_type || '',
    is_active: template?.is_active ?? true
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (template) {
        // Update existing template
        const { error } = await supabase
          .from('caption_templates')
          .update(data)
          .eq('id', template.id);
        
        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from('caption_templates')
          .insert(data);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      onSave();
    }
  });

  const handleSave = () => {
    if (!formData.name.trim() || !formData.template.trim()) {
      return;
    }

    saveMutation.mutate({
      ...formData,
      platform: formData.platform || null,
      content_type: formData.content_type || null
    });
  };

  if (!isOpen) return null;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {template ? 'Edit Template' : 'Create Caption Template'}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="template-name">Template Name *</Label>
          <Input
            id="template-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Instagram Success Story"
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="platform">Platform</Label>
            <Select
              value={formData.platform}
              onValueChange={(value) => setFormData({ ...formData, platform: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Platforms</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="content-type">Content Type</Label>
            <Select
              value={formData.content_type}
              onValueChange={(value) => setFormData({ ...formData, content_type: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
                <SelectItem value="single_image">Single Image</SelectItem>
                <SelectItem value="story">Story</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="template-content">Template Content *</Label>
          <Textarea
            id="template-content"
            value={formData.template}
            onChange={(e) => setFormData({ ...formData, template: e.target.value })}
            placeholder="Enter your caption template... Use {{variable}} for dynamic content"
            rows={8}
            className="mt-1 font-mono text-sm"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Use variables like: {{asset.title}}, {{asset.description}}, {{creator.name}}, {{business.name}}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is-active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="is-active" className="text-sm">
            Active (available for use)
          </Label>
        </div>

        <div className="flex items-center space-x-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !formData.name.trim() || !formData.template.trim()}
          >
            {saveMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {template ? 'Update' : 'Create'} Template
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// Template Preview Component
interface TemplatePreviewProps {
  template: Tables<'caption_templates'>;
  onClose: () => void;
}

function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  const [renderedCaption, setRenderedCaption] = useState('');
  const [isRendering, setIsRendering] = useState(false);

  const renderPreview = async () => {
    setIsRendering(true);
    try {
      // Create mock data for preview
      const mockAsset = {
        title: 'Sample Real Estate Deal',
        description: 'Found an amazing wholesale opportunity in downtown. Here\'s how I did it...',
        content_type: 'reel' as ContentType
      };

      const mockContext = {
        asset: mockAsset as any,
        creator: { name: 'John Doe', handle: 'johndoe' },
        business: { name: 'Wholesale Mastery', website: 'wholesalemastery.com' }
      };

      const rendered = await captionRenderer.renderCaption(
        template.id, 
        mockContext, 
        template.platform as Platform || 'instagram'
      );

      setRenderedCaption(rendered.text);
    } catch (error) {
      console.error('Preview render failed:', error);
      setRenderedCaption('Preview failed to render');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-foreground mb-2">{template.name}</h3>
        <div className="flex items-center space-x-2">
          {template.platform && (
            <Badge className="text-xs">
              {template.platform}
            </Badge>
          )}
          {template.content_type && (
            <Badge variant="secondary" className="text-xs">
              {template.content_type.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Template:</Label>
        <div className="mt-1 p-3 bg-muted rounded-lg text-sm font-mono whitespace-pre-wrap">
          {template.template}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Preview with Sample Data:</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={renderPreview}
            disabled={isRendering}
          >
            {isRendering ? (
              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Eye className="mr-2 h-3 w-3" />
            )}
            Render Preview
          </Button>
        </div>
        
        {renderedCaption && (
          <div className="p-3 border rounded-lg text-sm whitespace-pre-wrap">
            {renderedCaption}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close Preview
        </Button>
      </div>
    </div>
  );
}