-- Add soft delete columns to food_logs table
ALTER TABLE public.food_logs 
ADD COLUMN status integer NOT NULL DEFAULT 1,
ADD COLUMN deleted_at timestamp with time zone;

-- Add index for better query performance on status
CREATE INDEX idx_food_logs_status ON public.food_logs(status);

-- Add comment to document the column
COMMENT ON COLUMN public.food_logs.status IS 'Status: 1 = active, 0 = deleted (soft delete)';
COMMENT ON COLUMN public.food_logs.deleted_at IS 'Timestamp when the record was soft deleted';