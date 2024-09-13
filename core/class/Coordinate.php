<?php

class Coordinate implements JsonSerializable
{
    private $latitude;
    private $longitude;
    private $eqLogic;

    public function __construct(jMQTT $JMQTT)
    {
        /** @var cmd[] $cmds */
        $cmds = $JMQTT->getCmd();
        foreach ($cmds as $cmd) {
            if ('latitude' === $cmd->getName()) {
                $this->latitude = $cmd->execCmd();
            }
            if ('longitude' === $cmd->getName()) {
                $this->longitude = $cmd->execCmd();
            }
        }

        if ($this->isValid()) {
            $this->eqLogic = $JMQTT;
        }
    }

    public function getLatitude(): string
    {
        return $this->latitude;
    }

    public function getLongitude(): string
    {
        return $this->longitude;
    }

    public function getEqLogic(): jMQTT
    {
        return $this->eqLogic;
    }

    public function isValid(): bool
    {
        return is_numeric($this->latitude) && is_numeric($this->longitude);
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->eqLogic->getId(),
            'name' => $this->eqLogic->getName(),
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
        ];
    }
}
