// src/components/ui/button.jsx

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { tv } from "tailwind-variants"
import { cn } from "@/lib/utils" // Ajuste o caminho se necessário

// --- Definição de todas as variantes de estilo do botão ---
const buttonVariants = tv({
  // Estilos base, aplicados a todas as variantes
  base: [
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
  ],

  // Nossos diferentes tipos de botões
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    },
  },

  // Valores padrão caso nenhuma variante seja especificada
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

// --- Componente React ---
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  // Se 'asChild' for true, ele usará o componente filho como container (ex: um Link),
  // aplicando os estilos do botão a ele. Caso contrário, renderiza um <button>.
  const Comp = asChild ? Slot : "button"
  
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }