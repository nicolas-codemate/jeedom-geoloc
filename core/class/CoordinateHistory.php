<?php

declare(strict_types=1);

final class CoordinateHistory implements JsonSerializable
{

    private $coordinate;
    private $date;

    public function __construct(Coordinate $coordinate, DateTime $date)
    {
        $this->coordinate = $coordinate;
        $this->date = $date;
    }

    public function getCoordinate(): Coordinate
    {
        return $this->coordinate;
    }

    public function getDate(): DateTime
    {
        return $this->date;
    }

    public function jsonSerialize(): array
    {
        return [
            'coordinate' => $this->coordinate->jsonSerialize(),
            'date' => $this->date->format(DateTimeInterface::ATOM),
        ];
    }
}
