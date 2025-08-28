import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Conversation, Message, Product } from '@/types/database';

export const useMessaging = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          products:product_id (
            id,
            name,
            images,
            price
          )
        `)
        .order('updated_at', { ascending: false });

      // If not admin, only show user's conversations
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConversations((data || []).map(conv => ({
        ...conv,
        status: conv.status as 'active' | 'closed' | 'pending',
        product: conv.products ? {
          id: conv.products.id,
          name: conv.products.name,
          images: conv.products.images,
          price: conv.products.price,
          description: '',
          category: '',
          sizes: [],
          colors: [],
          stock_quantity: 0,
          is_active: true,
          created_at: '',
          updated_at: ''
        } : undefined
      })));
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin, toast]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, sender_type, content, message_type, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(msg => ({
        ...msg,
        sender_type: msg.sender_type as 'user' | 'admin',
        message_type: msg.message_type as 'text' | 'system'
      })));
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Create new conversation
  const createConversation = useCallback(async (
    subject: string,
    productId?: string,
    initialMessage?: string
  ) => {
    if (!user) return null;

    try {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          product_id: productId,
          subject,
          status: 'active'
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add initial message if provided
      if (initialMessage && conversation) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_id: user.id,
            sender_type: 'user',
            content: initialMessage,
            message_type: 'text'
          });

        if (msgError) throw msgError;
      }

      toast({
        title: "Success",
        description: "Conversation created successfully",
      });

      // Reload conversations
      await loadConversations();
      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast, loadConversations]);

  // Send message
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string
  ) => {
    if (!user) return;

    try {
      const senderType = isAdmin ? 'admin' : 'user';
      
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: senderType,
          content,
          message_type: 'text'
        });

      if (error) throw error;

      // Reload messages for active conversation
      if (activeConversation === conversationId) {
        await loadMessages(conversationId);
      }

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  }, [user, isAdmin, activeConversation, loadMessages, loadConversations, toast]);

  // Update conversation status
  const updateConversationStatus = useCallback(async (
    conversationId: string,
    status: 'active' | 'closed' | 'pending'
  ) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Conversation marked as ${status}`,
      });

      await loadConversations();
    } catch (error) {
      console.error('Error updating conversation status:', error);
      toast({
        title: "Error",
        description: "Failed to update conversation status",
        variant: "destructive",
      });
    }
  }, [isAdmin, loadConversations, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to conversation changes
    const conversationSubscription = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    // Subscribe to message changes
    const messageSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (activeConversation && (payload.new as any)?.conversation_id === activeConversation) {
            loadMessages(activeConversation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationSubscription);
      supabase.removeChannel(messageSubscription);
    };
  }, [user, activeConversation, loadConversations, loadMessages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation, loadMessages]);

  return {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    isLoading,
    createConversation,
    sendMessage,
    updateConversationStatus,
    refreshConversations: loadConversations,
  };
};