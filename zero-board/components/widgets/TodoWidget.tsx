"use client";

import { useState, useEffect } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { CheckCircle2, Circle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { widgetsApi } from "@/lib/api";

interface TodoWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export function TodoWidget({ widget, isEditMode, onDelete, onConfigure }: TodoWidgetProps) {
  const queryClient = useQueryClient();
  const todosRaw = widget.config?.todos;
  const [todos, setTodos] = useState<TodoItem[]>(() => Array.isArray(todosRaw) ? todosRaw : []);
  const [newTodo, setNewTodo] = useState("");

  // Update local state when widget config changes
  useEffect(() => {
    const newTodosRaw = widget.config?.todos;
    const newTodos = Array.isArray(newTodosRaw) ? newTodosRaw : [];
    setTodos((prevTodos) => {
      // Only update if todos actually changed
      if (JSON.stringify(prevTodos) !== JSON.stringify(newTodos)) {
        return newTodos;
      }
      return prevTodos;
    });
  }, [widget.config?.todos]);

  // Save todos to widget config
  const updateTodosMutation = useMutation({
    mutationFn: (updatedTodos: TodoItem[]) =>
      widgetsApi.update(widget.board_id, widget.id, {
        config: { ...(widget.config || {}), todos: updatedTodos },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", widget.board_id] });
    },
  });

  const saveTodos = (updatedTodos: TodoItem[]) => {
    setTodos(updatedTodos);
    updateTodosMutation.mutate(updatedTodos);
  };

  const toggleTodo = (id: string) => {
    const updatedTodos = todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    saveTodos(updatedTodos);
  };

  const deleteTodo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggle when clicking delete
    const updatedTodos = todos.filter(todo => todo.id !== id);
    saveTodos(updatedTodos);
  };

  const addTodo = () => {
    if (newTodo.trim()) {
      const updatedTodos = [...todos, { id: Date.now().toString(), text: newTodo, completed: false }];
      saveTodos(updatedTodos);
      setNewTodo("");
    }
  };

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
      <div className="flex h-full flex-col gap-2">
        <div className="flex-1 space-y-2 overflow-y-auto">
          {todos.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              No todos yet. Add one below!
            </p>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-[var(--muted)]/50 rounded p-2 transition-colors group"
                onClick={() => toggleTodo(todo.id)}
              >
                {todo.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-[var(--text-muted)] flex-shrink-0" />
                )}
                <span
                  className={`flex-1 text-sm ${
                    todo.completed
                      ? "line-through text-[var(--text-muted)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={(e) => deleteTodo(todo.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 hover:bg-red-500/20 rounded text-[var(--text-muted)] hover:text-red-500"
                  title="Delete todo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 border-t border-[var(--border)] pt-2">
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Add todo..."
            className="flex-1 text-sm"
          />
          <Button
            size="sm"
            onClick={addTodo}
            className="px-3"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </WidgetWrapper>
  );
}




