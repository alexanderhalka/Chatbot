import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import ChatInterface from './ChatInterface';
import { ConfirmDialogProvider } from '../ConfirmDialogContext';
import { ThemeProvider } from '../ThemeContext';


beforeAll(() => {
  // jsdom doesn't always implement focus/selection fully
  HTMLTextAreaElement.prototype.focus = jest.fn();
  // ChatInterface scrolls to bottom via scrollIntoView; jsdom doesn't implement it
  if (typeof Element !== 'undefined') {
    Element.prototype.scrollIntoView = jest.fn();
  }
  if (typeof HTMLElement !== 'undefined') {
    HTMLElement.prototype.scrollIntoView = jest.fn();
  }
  if (typeof HTMLTextAreaElement !== 'undefined' && !HTMLTextAreaElement.prototype.setSelectionRange) {
    HTMLTextAreaElement.prototype.setSelectionRange = jest.fn();
  }
});

function wrap(ui) {
  return render(
    <ThemeProvider>
      <ConfirmDialogProvider>{ui}</ConfirmDialogProvider>
    </ThemeProvider>
  );
}

test('keeps per-chat draft text when switching chats', () => {
  const onSendMessage = jest.fn();

  const { rerender } = wrap(
    <ChatInterface
      messages={[]}
      setMessages={jest.fn()}
      sessionId="chatA"
      onSendMessage={onSendMessage}
      isLoading={false}
      onEditMessage={jest.fn()}
      onDeleteMessage={jest.fn()}
      onRedoAiMessage={jest.fn()}
    />
  );

  const textarea = screen.getByPlaceholderText('Type your message here...');

  fireEvent.change(textarea, { target: { value: 'hello from A' } });
  expect(textarea.value).toBe('hello from A');

  rerender(
    <ThemeProvider>
      <ConfirmDialogProvider>
        <ChatInterface
          messages={[]}
          setMessages={jest.fn()}
          sessionId="chatB"
          onSendMessage={onSendMessage}
          isLoading={false}
          onEditMessage={jest.fn()}
          onDeleteMessage={jest.fn()}
          onRedoAiMessage={jest.fn()}
        />
      </ConfirmDialogProvider>
    </ThemeProvider>
  );

  const textareaB = screen.getByPlaceholderText('Type your message here...');
  expect(textareaB.value).toBe('');

  fireEvent.change(textareaB, { target: { value: 'hello from B' } });
  expect(textareaB.value).toBe('hello from B');

  rerender(
    <ThemeProvider>
      <ConfirmDialogProvider>
        <ChatInterface
          messages={[]}
          setMessages={jest.fn()}
          sessionId="chatA"
          onSendMessage={onSendMessage}
          isLoading={false}
          onEditMessage={jest.fn()}
          onDeleteMessage={jest.fn()}
          onRedoAiMessage={jest.fn()}
        />
      </ConfirmDialogProvider>
    </ThemeProvider>
  );

  const textareaA2 = screen.getByPlaceholderText('Type your message here...');
  expect(textareaA2.value).toBe('hello from A');
});

test('shows confirm modal when saving an edit that deletes subsequent messages', async () => {
  const onEditMessage = jest.fn().mockResolvedValue(true);

  const messages = [
    { id: 1, sender: 'user', text: 'original', timestamp: '1' },
    { id: 2, sender: 'ai', text: 'reply', timestamp: '2' },
  ];

  wrap(
    <ChatInterface
      messages={messages}
      setMessages={jest.fn()}
      sessionId="chatA"
      onSendMessage={jest.fn()}
      isLoading={false}
      onEditMessage={onEditMessage}
      onDeleteMessage={jest.fn()}
      onRedoAiMessage={jest.fn()}
    />
  );

  // Open the user message menu (first "More options" button)
  const menuButtons = screen.getAllByTitle('More options');
  fireEvent.click(menuButtons[0]);

  // Click Edit
  fireEvent.click(screen.getByText('Edit'));

  const editTextarea = screen.getByDisplayValue('original');
  fireEvent.change(editTextarea, { target: { value: 'changed' } });

  // Click Confirm save
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

  // Confirm modal should appear
  await waitFor(() => {
    expect(screen.getByText('Edit message?')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => {
    expect(onEditMessage).toHaveBeenCalledWith(0, 'changed');
  });
});

