import {
  Component, inject, signal,
  ElementRef, ViewChild, afterNextRender
} from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { MessageComponent } from '../message/message.component';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { QUICK_PROMPTS } from '../../models/chat.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [MessageComponent, TypingIndicatorComponent],
  templateUrl: './chat.component.html'
})
export class ChatComponent {
  chatService = inject(ChatService);

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  inputText = signal('');
  quickPrompts = QUICK_PROMPTS;

  constructor() {
    // Auto-scroll after each render
    afterNextRender(() => this.scrollToBottom());
  }

  sendMessage(text?: string): void {
    const message = text ?? this.inputText().trim();
    if (!message) return;
    this.inputText.set('');
    this.chatService.sendMessage(message);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  scrollToBottom(): void {
    this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
  }
}
